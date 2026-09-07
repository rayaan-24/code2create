import math
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.dependencies.auth import get_active_or_demo_user
from app.models.user import User
from app.schemas.location import LocationRead
from app.schemas.response import ResponseEnvelope
from app.services.location_service import list_locations, get_location_by_id

router = APIRouter(prefix="/locations", tags=["Locations"])


@router.get("", response_model=ResponseEnvelope[List[LocationRead]])
def get_locations(
    search: Optional[str] = Query(None, description="Search name, room or description"),
    building_id: Optional[str] = Query(None),
    floor: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_active_or_demo_user),
    db: Session = Depends(get_db),
):
    locations, total = list_locations(
        db=db,
        community_id=current_user.community_id,
        search=search,
        building_id=building_id,
        floor=floor,
        page=page,
        page_size=page_size,
    )
    return ResponseEnvelope(
        data=[LocationRead.model_validate(l) for l in locations],
        meta={
            "page": page,
            "page_size": page_size,
            "total_items": total,
            "total_pages": math.ceil(total / page_size) if page_size > 0 else 1,
        },
    )


@router.get("/{location_id}", response_model=ResponseEnvelope[LocationRead])
def get_location(
    location_id: str,
    current_user: User = Depends(get_active_or_demo_user),
    db: Session = Depends(get_db),
):
    location = get_location_by_id(
        db, community_id=current_user.community_id, location_id=location_id
    )
    return ResponseEnvelope(data=LocationRead.model_validate(location))
