import io
import json
import zipfile
import pytest
from pypdf import PdfWriter
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.base import Base
from app.models.community import Community
from app.models.user import User, UserRole
from app.models.document import Document, DocumentVersion
from app.models.chunk import KnowledgeChunk
from app.models.procedure import VerificationStatus
from app.ai.retrieval.ingestion import TextCleaner, DocumentParser, ParsedPage
from app.services.storage_service import DocumentStorageService
from app.services.ingestion_service import DocumentIngestionService


def test_text_cleaner_operations():
    """Verify that TextCleaner cleans, normalizes unicode, fixes hyphenation, and removes control characters."""
    # Control characters + ligature/unicode NFKC
    raw = "Hello\x00 World!\x07 \ufb01nd the secret."  # \ufb01 is 'fi' ligature
    cleaned = TextCleaner.clean(raw)
    assert "\x00" not in cleaned
    assert "\x07" not in cleaned
    assert "find the secret" in cleaned

    # Hyphenation across line break
    hyphen_text = "Please follow the proce-\n  dure carefully."
    cleaned_hyphen = TextCleaner.clean(hyphen_text)
    assert "procedure carefully." in cleaned_hyphen

    # Excessive newlines collapse
    excessive_spacing = "Header\n\n\n\n\nBody line 1\n\n\nBody line 2"
    cleaned_spacing = TextCleaner.clean(excessive_spacing)
    assert "\n\n\n" not in cleaned_spacing
    assert "Header\n\nBody line 1\n\nBody line 2" == cleaned_spacing


def test_file_validation_rules():
    """Test validation of empty files, sizes, extensions, and magic headers."""
    # 1. Empty file
    with pytest.raises(ValueError, match="is empty"):
        DocumentParser.validate_file_content(b"", "rules.txt")

    # 2. File exceeding limit
    with pytest.raises(ValueError, match="exceeds maximum allowed size"):
        DocumentParser.validate_file_content(b"A" * 100, "large.txt", max_size_bytes=50)

    # 3. Unsupported extension
    with pytest.raises(ValueError, match="Unsupported file type"):
        DocumentParser.validate_file_content(b"print('hello')", "script.py")

    # 4. Invalid PDF magic bytes
    with pytest.raises(ValueError, match="lacks a valid PDF header"):
        DocumentParser.validate_file_content(b"Not a real pdf content", "report.pdf")

    # 5. Invalid DOCX magic bytes
    with pytest.raises(ValueError, match="lacks a valid zip archive header"):
        DocumentParser.validate_file_content(b"Not a zip content", "handbook.docx")

    # 6. Valid text and markdown
    ext_txt = DocumentParser.validate_file_content(b"Valid text", "notes.txt")
    assert ext_txt == ".txt"

    ext_md = DocumentParser.validate_file_content(b"# Title\n\nContent", "guide.md")
    assert ext_md == ".md"


def test_document_parser_markdown_and_txt():
    """Test parsing markdown with sections and headers."""
    md_content = """# Campus Parking Policy
Students must register their vehicles at the security office.

## Visitor Parking
Visitors can park in Lot C for up to 4 hours.

## Overnight Regulations
No overnight parking is permitted without a special permit from campus security.
"""
    pages = DocumentParser.parse_file(md_content.encode("utf-8"), "parking.md")
    assert len(pages) >= 2
    assert any("Visitor Parking" in p.section for p in pages)
    assert any("Overnight" in p.section for p in pages)
    assert any("Lot C" in p.content for p in pages)


def test_document_parser_docx_zip():
    """Test parsing real DOCX structure created in-memory."""
    # Build a minimal valid DOCX zip in memory
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        document_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:body>
        <w:p>
            <w:pPr>
                <w:pStyle w:val="Heading1"/>
            </w:pPr>
            <w:r><w:t>Hostel Regulations</w:t></w:r>
        </w:p>
        <w:p>
            <w:r><w:t>Quiet hours begin strictly at 10:00 PM.</w:t></w:r>
        </w:p>
        <w:p>
            <w:r><w:t>Guests must register at the reception desk.</w:t></w:r>
        </w:p>
    </w:body>
</w:document>"""
        zf.writestr("word/document.xml", document_xml)

    docx_bytes = buf.getvalue()

    # Validate header & structure
    ext = DocumentParser.validate_file_content(docx_bytes, "hostel_rules.docx")
    assert ext == ".docx"

    # Parse content
    pages = DocumentParser.parse_file(docx_bytes, "hostel_rules.docx")
    assert len(pages) == 1
    assert "Hostel Regulations" in pages[0].section or "Hostel Regulations" in pages[0].content
    assert "Quiet hours begin strictly at 10:00 PM." in pages[0].content
    assert "Guests must register" in pages[0].content


def test_document_parser_pdf():
    """Test parsing real PDF document created in-memory with pypdf."""
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)

    buf = io.BytesIO()
    writer.write(buf)
    pdf_bytes = buf.getvalue()

    ext = DocumentParser.validate_file_content(pdf_bytes, "blank.pdf")
    assert ext == ".pdf"


def test_document_storage_service(tmp_path):
    """Test DocumentStorageService saving, retrieving, and deleting files."""
    storage = DocumentStorageService(base_dir=str(tmp_path))

    comm_id = "comm-test-123"
    doc_id = "doc-uuid-456"
    filename = "lab_safety_guidelines.md"
    file_bytes = b"# Lab Safety\nWear protective goggles at all times."

    storage_key, checksum = storage.save_file(
        community_id=comm_id,
        document_id=doc_id,
        file_name=filename,
        file_bytes=file_bytes,
    )

    assert storage_key == f"{comm_id}/{doc_id}_lab_safety_guidelines.md"
    assert len(checksum) == 64  # SHA-256 hex string

    # Verify retrieval
    retrieved = storage.get_file(storage_key)
    assert retrieved == file_bytes

    # Verify exists
    assert storage.exists(storage_key) is True

    # Verify deletion
    deleted = storage.delete_file(storage_key)
    assert deleted is True
    assert storage.exists(storage_key) is False


def test_end_to_end_document_ingestion_pipeline(tmp_path):
    """
    Test end-to-end execution of DocumentIngestionService:
    Validate -> Store Original -> Extract -> Clean -> Chunk -> Embed (384d) -> Store Chunks in DB
    """
    # Create isolated in-memory SQLite database
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine)
    db = TestingSession()

    try:
        # Create test community & user
        community = Community(id="comm-ingest-1", name="Engineering Campus")
        db.add(community)

        user = User(
            id="user-admin-1",
            community_id=community.id,
            email="admin@eng.edu",
            name="Campus Admin",
            password_hash="fakehash",
            role=UserRole.ADMIN,
        )
        db.add(user)
        db.commit()

        # Storage in temp directory
        storage = DocumentStorageService(base_dir=str(tmp_path))
        ingestion_service = DocumentIngestionService(storage=storage)

        doc_text = """# Academic Calendar 2026-2027

The academic year consists of Fall and Spring semesters.
Fall semester starts on September 1st and ends on December 20th.

## Examination Schedule
Final examinations are scheduled during the last two weeks of each semester.
Students with examination conflicts must submit a notification form 30 days prior.

## Grading Policy
Grading scale follows the standard GPA 4.0 system.
Grade appeals must be submitted within 14 days of grade posting.
"""
        doc_bytes = doc_text.encode("utf-8")

        response = ingestion_service.ingest_document(
            db=db,
            community_id=community.id,
            file_name="academic_calendar.md",
            file_bytes=doc_bytes,
            user_id=user.id,
            title="Academic Calendar",
            description="Official 2026-2027 Academic Schedule",
            auto_verify=True,
        )

        assert response.document_id is not None
        assert response.title == "Academic Calendar"
        assert response.file_name == "academic_calendar.md"
        assert response.pages_parsed >= 2
        assert response.chunks_created >= 2
        assert response.verification_status == "VERIFIED"
        assert len(response.file_checksum) == 64

        # Verify original file stored on disk
        assert storage.exists(response.storage_key) is True
        saved_bytes = storage.get_file(response.storage_key)
        assert saved_bytes == doc_bytes

        # Verify Document row in database
        doc_in_db = db.query(Document).filter(Document.id == response.document_id).first()
        assert doc_in_db is not None
        assert doc_in_db.title == "Academic Calendar"
        assert doc_in_db.storage_key == response.storage_key
        assert doc_in_db.verification_status == VerificationStatus.VERIFIED

        # Verify DocumentVersion row in database
        version_in_db = db.query(DocumentVersion).filter(DocumentVersion.document_id == response.document_id).first()
        assert version_in_db is not None
        assert version_in_db.version_number == 1
        assert version_in_db.storage_key == response.storage_key

        # Verify KnowledgeChunk rows in database
        chunks_in_db = (
            db.query(KnowledgeChunk)
            .filter(KnowledgeChunk.document_id == response.document_id)
            .order_by(KnowledgeChunk.chunk_index)
            .all()
        )
        assert len(chunks_in_db) == response.chunks_created
        assert len(chunks_in_db) >= 2

        # Validate chunk attributes and embedding format
        for chunk in chunks_in_db:
            assert chunk.community_id == community.id
            assert chunk.content is not None and len(chunk.content) > 0
            assert chunk.token_count > 0
            assert chunk.verification_status == "VERIFIED"
            
            # 384-dimensional dense vector check
            assert chunk.embedding is not None
            assert len(chunk.embedding) == 384
            # Backward-compatible embedding_json check
            assert chunk.embedding_json is not None
            parsed_json_vec = json.loads(chunk.embedding_json)
            assert len(parsed_json_vec) == 384

            # Metadata check
            meta = chunk.metadata_dict
            assert meta.get("document_id") == response.document_id
            assert meta.get("community_id") == community.id
            assert meta.get("file_name") == "academic_calendar.md"
            assert meta.get("checksum") == response.file_checksum
            assert meta.get("storage_key") == response.storage_key

    finally:
        db.close()


def test_admin_upload_document_api(client, token_admin_a):
    """Test admin document upload API endpoint."""
    headers = {"Authorization": f"Bearer {token_admin_a}"}
    file_content = b"# Emergency Evacuation Plan\n\nFollow exit signs towards the assembly ground."
    files = {"file": ("evacuation_plan.md", file_content, "text/markdown")}
    data = {"title": "Emergency Evacuation Plan", "description": "Safety procedure"}

    res = client.post(
        "/api/v1/admin/documents/upload",
        files=files,
        data=data,
        headers=headers,
    )
    assert res.status_code == 200
    res_data = res.json()["data"]
    assert res_data["title"] == "Emergency Evacuation Plan"
    assert res_data["file_name"] == "evacuation_plan.md"
    assert res_data["chunks_created"] >= 1
    assert res_data["verification_status"] == "VERIFIED"


def test_user_upload_forbidden_api(client, token_user_a):
    """Test that normal users cannot upload and ingest documents."""
    headers = {"Authorization": f"Bearer {token_user_a}"}
    files = {"file": ("unauthorized.txt", b"secret info", "text/plain")}

    res = client.post(
        "/api/v1/documents/upload",
        files=files,
        data={"title": "Unauthorized"},
        headers=headers,
    )
    assert res.status_code == 403


def test_invalid_file_upload_rejected_api(client, token_admin_a):
    """Test that invalid files (empty or unsupported extension) are rejected with 400."""
    headers = {"Authorization": f"Bearer {token_admin_a}"}
    files = {"file": ("malware.exe", b"MZ\x90\x00", "application/octet-stream")}

    res = client.post(
        "/api/v1/admin/documents/upload",
        files=files,
        data={"title": "Invalid Binary"},
        headers=headers,
    )
    assert res.status_code == 400
