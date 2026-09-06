import math
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.procedure import VerificationStatus
from app.schemas.document import DocumentRead
from app.schemas.response import ResponseEnvelope
from app.services.document_service import list_documents, get_document_by_id

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
