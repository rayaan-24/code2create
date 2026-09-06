from datetime import datetime, timezone
from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.procedure import (
    Procedure,
    ProcedureStep,
    ProcedureRequirement,
    VerificationStatus,
)
from app.schemas.procedure import (
    ProcedureCreate,
    ProcedureUpdate,
    ProcedureVerifyRequest,
)


def list_procedures(
    db: Session,
    community_id: str,
    search: Optional[str] = None,
    category: Optional[str] = None,
    verification_status: Optional[VerificationStatus] = None,
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[Procedure], int]:
    query = db.query(Procedure).filter(Procedure.community_id == community_id)

    if category and category != "All":
        query = query.filter(Procedure.category == category)

    if verification_status:
        query = query.filter(Procedure.verification_status == verification_status)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Procedure.title.ilike(search_term),
                Procedure.description.ilike(search_term),
                Procedure.category.ilike(search_term),
            )
        )

    total_count = query.count()
    offset = (page - 1) * page_size
    procedures = query.offset(offset).limit(page_size).all()
    return procedures, total_count


def get_procedure_by_id(db: Session, community_id: str, procedure_id: str) -> Procedure:
    proc = (
        db.query(Procedure)
        .filter(Procedure.id == procedure_id, Procedure.community_id == community_id)
        .first()
    )
    if not proc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "Procedure not found"},
        )
    return proc


def create_procedure(
    db: Session, community_id: str, proc_in: ProcedureCreate
) -> Procedure:
    proc = Procedure(
        community_id=community_id,
        service_id=proc_in.service_id,
        title=proc_in.title,
        description=proc_in.description,
        category=proc_in.category,
        fee=proc_in.fee,
        estimated_time=proc_in.estimated_time,
        eligibility=proc_in.eligibility,
        verification_status=VerificationStatus.PENDING,
        is_active=proc_in.is_active,
    )
    db.add(proc)
    db.commit()
    db.refresh(proc)

    # Add steps if provided
    if proc_in.steps:
        for s in proc_in.steps:
            step = ProcedureStep(
                procedure_id=proc.id,
                step_number=s.step_number,
                instruction=s.instruction,
            )
            db.add(step)

    # Add requirements if provided
    if proc_in.requirements:
        for r in proc_in.requirements:
            req = ProcedureRequirement(
                procedure_id=proc.id,
                name=r.name,
                description=r.description,
                required=r.required,
            )
            db.add(req)

    db.commit()
    db.refresh(proc)
    return proc


def update_procedure(
    db: Session, community_id: str, procedure_id: str, proc_in: ProcedureUpdate
) -> Procedure:
    proc = get_procedure_by_id(db, community_id, procedure_id)
    update_data = proc_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(proc, field, value)
    db.commit()
    db.refresh(proc)
    return proc


def verify_procedure(
    db: Session,
    community_id: str,
    procedure_id: str,
    verify_in: ProcedureVerifyRequest,
    admin_user_id: str,
) -> Procedure:
    proc = get_procedure_by_id(db, community_id, procedure_id)
    proc.verification_status = verify_in.status
    proc.verified_by = admin_user_id
    proc.verified_at = datetime.now(timezone.utc)
    if verify_in.review_due_at:
        proc.review_due_at = verify_in.review_due_at
    db.commit()
    db.refresh(proc)
    return proc


def delete_procedure(db: Session, community_id: str, procedure_id: str) -> None:
    proc = get_procedure_by_id(db, community_id, procedure_id)
    db.delete(proc)
    db.commit()
