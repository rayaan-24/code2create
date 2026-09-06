from datetime import datetime, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.document import Document, DocumentVersion
from app.models.procedure import VerificationStatus
from app.schemas.document import (
    DocumentCreate,
    DocumentUpdate,
    DocumentUploadNewVersion,
    DocumentVerifyRequest,
)


def list_documents(
    db: Session,
    community_id: str,
    search: Optional[str] = None,
    verification_status: Optional[VerificationStatus] = None,
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[Document], int]:
    query = db.query(Document).filter(Document.community_id == community_id)

    if verification_status:
        query = query.filter(Document.verification_status == verification_status)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Document.title.ilike(search_term),
                Document.description.ilike(search_term),
                Document.file_name.ilike(search_term),
            )
        )

    total_count = query.count()
    offset = (page - 1) * page_size
    documents = query.offset(offset).limit(page_size).all()
    return documents, total_count


def get_document_by_id(db: Session, community_id: str, document_id: str) -> Document:
    doc = (
        db.query(Document)
        .filter(Document.id == document_id, Document.community_id == community_id)
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "Document not found"},
        )
    return doc


def create_document(
    db: Session, community_id: str, doc_in: DocumentCreate, user_id: str
) -> Document:
    doc = Document(
        community_id=community_id,
        title=doc_in.title,
        description=doc_in.description,
        file_name=doc_in.file_name,
        file_type=doc_in.file_type,
        storage_key=doc_in.storage_key,
        source_url=doc_in.source_url,
        version=1,
        uploaded_by=user_id,
        verification_status=VerificationStatus.PENDING,
        is_active=doc_in.is_active,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Initial version record
    initial_ver = DocumentVersion(
        document_id=doc.id,
        version_number=1,
        file_name=doc_in.file_name,
        storage_key=doc_in.storage_key,
        uploaded_by=user_id,
        change_summary="Initial document upload",
    )
    db.add(initial_ver)
    db.commit()
    db.refresh(doc)
    return doc


def upload_new_document_version(
    db: Session,
    community_id: str,
    document_id: str,
    version_in: DocumentUploadNewVersion,
    user_id: str,
) -> Document:
    doc = get_document_by_id(db, community_id, document_id)

    new_version_num = doc.version + 1
    doc.version = new_version_num
    doc.file_name = version_in.file_name
    if version_in.file_type:
        doc.file_type = version_in.file_type
    if version_in.storage_key:
        doc.storage_key = version_in.storage_key

    # Reset verification status on new version upload
    doc.verification_status = VerificationStatus.PENDING
    doc.verified_by = None
    doc.verified_at = None

    ver = DocumentVersion(
        document_id=doc.id,
        version_number=new_version_num,
        file_name=version_in.file_name,
        storage_key=version_in.storage_key,
        uploaded_by=user_id,
        change_summary=version_in.change_summary,
    )
    db.add(ver)
    db.commit()
    db.refresh(doc)
    return doc


def verify_document(
    db: Session,
    community_id: str,
    document_id: str,
    verify_in: DocumentVerifyRequest,
    admin_user_id: str,
) -> Document:
    doc = get_document_by_id(db, community_id, document_id)
    doc.verification_status = verify_in.status
    doc.verified_by = admin_user_id
    doc.verified_at = datetime.now(timezone.utc)
    if verify_in.review_due_at:
        doc.review_due_at = verify_in.review_due_at
    db.commit()
    db.refresh(doc)
    return doc


def delete_document(db: Session, community_id: str, document_id: str) -> None:
    doc = get_document_by_id(db, community_id, document_id)
    db.delete(doc)
    db.commit()
