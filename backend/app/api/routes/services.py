import math
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.service import Service
from app.schemas.service import ServiceRead
from app.schemas.response import ResponseEnvelope

router = APIRouter(prefix="/services", tags=["Services"])


@router.get("", response_model=ResponseEnvelope[List[ServiceRead]])
def list_services(
    search: Optional[str] = Query(None, description="Search service name or description"),
    category: Optional[str] = Query(None),
    is_urgent: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Service).filter(
        Service.community_id == current_user.community_id, Service.is_active == True
    )

    if category and category != "All":
        query = query.filter(Service.category.ilike(f"%{category}%"))

    if is_urgent is not None:
        query = query.filter(Service.is_urgent == is_urgent)

    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Service.name.ilike(term),
                Service.description.ilike(term),
                Service.department.ilike(term),
            )
        )

    total = query.count()
    offset = (page - 1) * page_size
    services = query.offset(offset).limit(page_size).all()

    return ResponseEnvelope(
        data=[ServiceRead.model_validate(s) for s in services],
        meta={
            "page": page,
            "page_size": page_size,
            "total_items": total,
            "total_pages": math.ceil(total / page_size) if page_size > 0 else 1,
        },
    )


@router.get("/{service_id}", response_model=ResponseEnvelope[ServiceRead])
def get_service(
    service_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = (
        db.query(Service)
        .filter(
            Service.id == service_id,
            Service.community_id == current_user.community_id,
        )
        .first()
    )
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "Service not found"},
        )
    return ResponseEnvelope(data=ServiceRead.model_validate(service))
