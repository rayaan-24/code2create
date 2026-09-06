import math
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.person import Person
from app.schemas.person import PersonRead
from app.schemas.response import ResponseEnvelope

router = APIRouter(prefix="/people", tags=["People Directory"])


@router.get("", response_model=ResponseEnvelope[List[PersonRead]])
def list_people(
    search: Optional[str] = Query(None, description="Search name, role, department"),
    department: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Person).filter(
        Person.community_id == current_user.community_id, Person.is_active == True
    )

    if department and department != "All":
        query = query.filter(Person.department.ilike(f"%{department}%"))

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Person.name.ilike(term),
                Person.role.ilike(term),
                Person.department.ilike(term),
                Person.email.ilike(term),
            )
        )

    total = query.count()
    offset = (page - 1) * page_size
    people = query.offset(offset).limit(page_size).all()

    return ResponseEnvelope(
        data=[PersonRead.model_validate(p) for p in people],
        meta={
            "page": page,
            "page_size": page_size,
            "total_items": total,
            "total_pages": math.ceil(total / page_size) if page_size > 0 else 1,
        },
    )


@router.get("/{person_id}", response_model=ResponseEnvelope[PersonRead])
def get_person(
    person_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    person = (
        db.query(Person)
        .filter(
            Person.id == person_id,
            Person.community_id == current_user.community_id,
        )
        .first()
    )
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "Person not found"},
        )
    return ResponseEnvelope(data=PersonRead.model_validate(person))
