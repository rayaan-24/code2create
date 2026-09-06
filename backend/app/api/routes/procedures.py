import math
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.procedure import VerificationStatus
from app.schemas.procedure import ProcedureRead
from app.schemas.response import ResponseEnvelope
from app.services.procedure_service import list_procedures, get_procedure_by_id

router = APIRouter(prefix="/procedures", tags=["Procedures"])


@router.get("", response_model=ResponseEnvelope[List[ProcedureRead]])
def get_procedures(
    search: Optional[str] = Query(None, description="Search title, description or category"),
    category: Optional[str] = Query(None),
    status: Optional[VerificationStatus] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    procedures, total = list_procedures(
        db=db,
        community_id=current_user.community_id,
        search=search,
        category=category,
        verification_status=status,
        page=page,
        page_size=page_size,
    )
    return ResponseEnvelope(
        data=[ProcedureRead.model_validate(p) for p in procedures],
        meta={
            "page": page,
            "page_size": page_size,
            "total_items": total,
            "total_pages": math.ceil(total / page_size) if page_size > 0 else 1,
        },
    )


@router.get("/{procedure_id}", response_model=ResponseEnvelope[ProcedureRead])
def get_procedure(
    procedure_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    proc = get_procedure_by_id(
        db=db, community_id=current_user.community_id, procedure_id=procedure_id
    )
    return ResponseEnvelope(data=ProcedureRead.model_validate(proc))
