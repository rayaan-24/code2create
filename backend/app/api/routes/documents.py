import math
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User, UserRole
from app.models.procedure import VerificationStatus
from app.schemas.document import DocumentRead, DocumentIngestionResponse
from app.schemas.response import ResponseEnvelope
from app.services.document_service import list_documents, get_document_by_id
from app.services.ingestion_service import document_ingestion_service

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("", response_model=ResponseEnvelope[List[DocumentRead]])
def get_documents(
    search: Optional[str] = Query(None, description="Search document title or description"),
    status: Optional[VerificationStatus] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    documents, total = list_documents(
        db=db,
        community_id=current_user.community_id,
        search=search,
        verification_status=status,
        page=page,
        page_size=page_size,
    )
    return ResponseEnvelope(
        data=[DocumentRead.model_validate(d) for d in documents],
        meta={
            "page": page,
            "page_size": page_size,
            "total_items": total,
            "total_pages": math.ceil(total / page_size) if page_size > 0 else 1,
        },
    )


@router.get("/{document_id}", response_model=ResponseEnvelope[DocumentRead])
def get_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    doc = get_document_by_id(
        db=db, community_id=current_user.community_id, document_id=document_id
    )
    return ResponseEnvelope(data=DocumentRead.model_validate(doc))


@router.post("/upload", response_model=ResponseEnvelope[DocumentIngestionResponse])
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload and ingest a document into the community knowledge base.
    Restricted to staff, faculty, or admin roles.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF, UserRole.FACULTY]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "INSUFFICIENT_PERMISSIONS", "message": "Only staff or administrators can ingest documents."},
        )

    file_bytes = await file.read()
    auto_verify = current_user.role in [UserRole.ADMIN, UserRole.SUPER_ADMIN]

    result = document_ingestion_service.ingest_document(
        db=db,
        community_id=current_user.community_id,
        file_name=file.filename or "document.txt",
        file_bytes=file_bytes,
        user_id=current_user.id,
        title=title,
        description=description,
        auto_verify=auto_verify,
    )
    return ResponseEnvelope(data=result)
