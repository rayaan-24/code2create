import io
import os
import re
import csv
import unicodedata
import zipfile
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional
from pypdf import PdfReader


class TextCleaner:
    """
    Normalizes, sanitizes, and cleans raw text extracted from documents.
    Removes artifacts, normalizes unicode, unwraps line-break hyphenations,
    and removes non-printable control characters.
    """

    # Unprintable control characters excluding \t, \n, \r
    CONTROL_CHAR_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
    # Excessive whitespace (3 or more newlines)
    EXCESSIVE_NEWLINES_RE = re.compile(r"\n{3,}")
    # Hyphenated word break across lines: e.g. "instruc-\ntion" -> "instruction"
    HYPHENATION_RE = re.compile(r"(\b[a-zA-Z]{2,})-\n\s*([a-zA-Z]{2,}\b)")

    @classmethod
    def clean(cls, text: str) -> str:
        """Execute full cleaning pipeline on text."""
        if not text:
            return ""

        # 1. Unicode NFKC normalization (standardizes ligatures, accented characters, full-width forms)
        text = unicodedata.normalize("NFKC", text)

        # 2. Strip null bytes and non-printable control characters
        text = cls.CONTROL_CHAR_RE.sub("", text)

        # 3. Standardize line endings to LF
        text = text.replace("\r\n", "\n").replace("\r", "\n")

        # 4. Fix hyphenated words broken across line breaks
        text = cls.HYPHENATION_RE.sub(r"\1\2", text)

        # 5. Clean trailing whitespace on each line
        lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
        text = "\n".join(lines)

        # 6. Collapse excessive blank lines to max 2 newlines (single blank line separator)
        text = cls.EXCESSIVE_NEWLINES_RE.sub("\n\n", text)

        return text.strip()


class ParsedPage:
    def __init__(self, page_number: int, content: str, section: Optional[str] = None):
        self.page_number = page_number
        self.content = content.strip()
        self.section = section or "General Information"


class DocumentParser:
    """
    Extracts text and structural sections from PDF, DOCX, PPTX, CSV, Markdown, and TXT files,
    validates file integrity, and applies text cleaning.
    """

    SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".txt", ".md", ".markdown", ".csv"}

    @classmethod
    def validate_file_content(
        cls,
        file_bytes: bytes,
        file_name: str,
        max_size_bytes: int = 25 * 1024 * 1024,
    ) -> str:
        """
        Validates file presence, size limits, extension, and magic byte headers.
        Returns the normalized file extension.
        """
        if not file_bytes or len(file_bytes) == 0:
            raise ValueError(f"Uploaded file '{file_name}' is empty (0 bytes).")

        if len(file_bytes) > max_size_bytes:
            mb_limit = max_size_bytes / (1024 * 1024)
            raise ValueError(f"File '{file_name}' exceeds maximum allowed size of {mb_limit:.1f} MB.")

        ext = os.path.splitext(file_name)[1].lower()
        if ext not in cls.SUPPORTED_EXTENSIONS:
            allowed = ", ".join(sorted(cls.SUPPORTED_EXTENSIONS))
            raise ValueError(f"Unsupported file type '{ext}' for '{file_name}'. Allowed formats: {allowed}")

        # Magic bytes verification
        if ext == ".pdf":
            # PDF header is %PDF-
            if not file_bytes[:1024].startswith(b"%PDF-") and b"%PDF-" not in file_bytes[:1024]:
                raise ValueError(f"File '{file_name}' claims to be PDF but lacks a valid PDF header.")
        elif ext in {".docx", ".pptx"}:
            # DOCX is a zip file starting with PK\x03\x04
            if not file_bytes.startswith(b"PK\x03\x04"):
                raise ValueError(f"File '{file_name}' claims to be DOCX but lacks a valid zip archive header.")
            try:
                with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
                    required = "word/document.xml" if ext == ".docx" else "ppt/presentation.xml"
                    if required not in zf.namelist():
                        raise ValueError(f"DOCX file '{file_name}' is missing the main 'word/document.xml' part.")
            except zipfile.BadZipFile:
                raise ValueError(f"File '{file_name}' is a corrupted or unreadable DOCX archive.")

        return ext

    @classmethod
    def parse_pdf(cls, file_bytes: bytes, file_name: str) -> List[ParsedPage]:
        """Extract text page-by-page from PDF with section detection."""
        pages: List[ParsedPage] = []
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            current_section = "General Information"

            for idx, page in enumerate(reader.pages):
                raw_text = page.extract_text() or ""
                cleaned = TextCleaner.clean(raw_text)

                # Detect potential section headers (lines starting with Section/Chapter/Policy/Title)
                lines = cleaned.split("\n")
                for line in lines[:5]:
                    line_clean = line.strip()
                    if re.match(r"^(Section|Chapter|Policy|Guidelines|Rule|\d+\.)\s+", line_clean, re.I):
                        current_section = line_clean
                        break

                if cleaned:
                    pages.append(ParsedPage(page_number=idx + 1, content=cleaned, section=current_section))
        except Exception as e:
            raise ValueError(f"Failed to parse PDF document {file_name}: {e}")

        return pages

    @classmethod
    def parse_docx(cls, file_bytes: bytes, file_name: str) -> List[ParsedPage]:
        """Extract structured text from DOCX using standard OpenXML XML parsing."""
        pages: List[ParsedPage] = []
        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
                xml_data = zf.read("word/document.xml")
            
            root = ET.fromstring(xml_data)
            ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

            paragraphs = []
            current_section = "General Information"

            for p in root.iter(f"{{{ns['w']}}}p"):
                # Check for heading style
                pPr = p.find(f"{{{ns['w']}}}pPr")
                if pPr is not None:
                    pStyle = pPr.find(f"{{{ns['w']}}}pStyle")
                    if pStyle is not None:
                        val = pStyle.get(f"{{{ns['w']}}}val", "")
                        if "Heading" in val:
                            heading_text = "".join(t.text for t in p.iter(f"{{{ns['w']}}}t") if t.text)
                            if heading_text.strip():
                                current_section = heading_text.strip()

                texts = [t.text for t in p.iter(f"{{{ns['w']}}}t") if t.text]
                p_text = "".join(texts).strip()
                if p_text:
                    paragraphs.append(p_text)

            full_text = "\n\n".join(paragraphs)
            cleaned = TextCleaner.clean(full_text)

            if cleaned:
                pages.append(ParsedPage(page_number=1, content=cleaned, section=current_section))

        except Exception as e:
            raise ValueError(f"Failed to parse DOCX document {file_name}: {e}")

        return pages

    @classmethod
    def parse_text(cls, text_content: str, file_name: str) -> List[ParsedPage]:
        """Extract text from plain text or markdown, grouping by headings."""
        cleaned_raw = TextCleaner.clean(text_content)
        pages: List[ParsedPage] = []
        sections = re.split(r"(?:\n|^)(#{1,3}\s+[^\n]+)", cleaned_raw)

        if len(sections) <= 1:
            if cleaned_raw:
                pages.append(ParsedPage(page_number=1, content=cleaned_raw, section="General"))
            return pages

        current_heading = "Overview"
        page_num = 1

        for part in sections:
            part = part.strip()
            if not part:
                continue
            if part.startswith("#"):
                current_heading = part.lstrip("#").strip()
            else:
                cleaned_part = TextCleaner.clean(part)
                if cleaned_part:
                    pages.append(ParsedPage(page_number=page_num, content=cleaned_part, section=current_heading))
                    page_num += 1

        return pages

    @classmethod
    def parse_pptx(cls, file_bytes: bytes, file_name: str) -> List[ParsedPage]:
        """Extract slide text in slide order from standard PPTX OpenXML files."""
        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as archive:
                slide_names = sorted(
                    (name for name in archive.namelist() if re.match(r"ppt/slides/slide\d+\.xml$", name)),
                    key=lambda name: int(re.search(r"slide(\d+)\.xml$", name).group(1)),
                )
                pages = []
                namespace = "{http://schemas.openxmlformats.org/drawingml/2006/main}t"
                for number, name in enumerate(slide_names, start=1):
                    root = ET.fromstring(archive.read(name))
                    text = TextCleaner.clean("\n".join(node.text for node in root.iter(namespace) if node.text))
                    if text:
                        heading = text.split("\n", 1)[0][:255]
                        pages.append(ParsedPage(number, text, heading or f"Slide {number}"))
                return pages
        except Exception as exc:
            raise ValueError(f"Failed to parse PPTX document {file_name}: {exc}") from exc

    @classmethod
    def parse_csv(cls, file_bytes: bytes, file_name: str) -> List[ParsedPage]:
        """Preserve CSV headers with every row rather than flattening table structure."""
        text = file_bytes.decode("utf-8-sig", errors="replace")
        rows = list(csv.reader(io.StringIO(text)))
        if not rows:
            return []
        headers = rows[0]
        table_rows = [" | ".join(f"{header}: {value}" for header, value in zip(headers, row)) for row in rows[1:]]
        content = TextCleaner.clean("Table columns: " + " | ".join(headers) + "\n\n" + "\n".join(table_rows))
        return [ParsedPage(1, content, "Table")]

    @classmethod
    def parse_file(cls, file_bytes: bytes, file_name: str) -> List[ParsedPage]:
        """Dispatch parser based on file extension with content validation."""
        ext = cls.validate_file_content(file_bytes, file_name)

        if ext == ".pdf":
            return cls.parse_pdf(file_bytes, file_name)
        elif ext == ".docx":
            return cls.parse_docx(file_bytes, file_name)
        elif ext == ".pptx":
            return cls.parse_pptx(file_bytes, file_name)
        elif ext == ".csv":
            return cls.parse_csv(file_bytes, file_name)
        elif ext in [".txt", ".md", ".markdown"]:
            text = file_bytes.decode("utf-8", errors="replace")
            return cls.parse_text(text, file_name)
        else:
            text = file_bytes.decode("utf-8", errors="replace")
            return cls.parse_text(text, file_name)
