import io
import os
import re
from typing import List, Dict, Any, Optional
from pypdf import PdfReader


class ParsedPage:
    def __init__(self, page_number: int, content: str, section: Optional[str] = None):
        self.page_number = page_number
        self.content = content.strip()
        self.section = section


class DocumentParser:
    """Extracts clean text and structural sections from PDF, TXT, and Markdown files."""

    @staticmethod
    def parse_pdf(file_bytes: bytes, file_name: str) -> List[ParsedPage]:
        """Extract text page-by-page from PDF with section detection."""
        pages: List[ParsedPage] = []
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            current_section = "General Information"

            for idx, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                # Detect potential section headers (lines in uppercase or starting with Chapter/Section)
                lines = text.split("\n")
                for line in lines[:5]:
                    line_clean = line.strip()
                    if re.match(r"^(Section|Chapter|Policy|Guidelines|\d+\.)\s+", line_clean, re.I):
                        current_section = line_clean
                        break

                if text.strip():
                    pages.append(ParsedPage(page_number=idx + 1, content=text, section=current_section))
        except Exception as e:
            raise ValueError(f"Failed to parse PDF document {file_name}: {e}")

        return pages

    @staticmethod
    def parse_text(text_content: str, file_name: str) -> List[ParsedPage]:
        """Extract text from plain text or markdown, grouping by headings."""
        pages: List[ParsedPage] = []
        # Split on markdown headings or large section dividers
        sections = re.split(r"(?:\n|^)(#{1,3}\s+[^\n]+)", text_content)

        if len(sections) <= 1:
            # Simple text without headings
            pages.append(ParsedPage(page_number=1, content=text_content, section="General"))
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
                pages.append(ParsedPage(page_number=page_num, content=part, section=current_heading))
                page_num += 1

        return pages

    @classmethod
    def parse_file(cls, file_bytes: bytes, file_name: str) -> List[ParsedPage]:
        """Dispatch parser based on file extension."""
        ext = os.path.splitext(file_name)[1].lower()
        if ext == ".pdf":
            return cls.parse_pdf(file_bytes, file_name)
        elif ext in [".txt", ".md", ".markdown"]:
            text = file_bytes.decode("utf-8", errors="ignore")
            return cls.parse_text(text, file_name)
        else:
            # Fallback as utf-8 plain text
            text = file_bytes.decode("utf-8", errors="ignore")
            return cls.parse_text(text, file_name)
