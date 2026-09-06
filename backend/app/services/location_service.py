from typing import List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.location import Location
from app.schemas.location import LocationCreate, LocationUpdate


def list_locations(
    db: Session,
    community_id: str,
    search: Optional[str] = None,
    building_id: Optional[str] = None,
    floor: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> Tuple[List[Location], int]:
    query = db.query(Location).filter(Location.community_id == community_id)

    if building_id:
        query = query.filter(Location.building_id == building_id)

    if floor:
        query = query.filter(Location.floor == floor)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Location.name.ilike(search_term),
                Location.room_number.ilike(search_term),
                Location.description.ilike(search_term),
            )
        )

    total_count = query.count()
    offset = (page - 1) * page_size
    locations = query.offset(offset).limit(page_size).all()
    return locations, total_count


def get_location_by_id(db: Session, community_id: str, location_id: str) -> Location:
    location = (
        db.query(Location)
        .filter(Location.id == location_id, Location.community_id == community_id)
        .first()
    )
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "Location not found"},
        )
    return location


def create_location(db: Session, community_id: str, loc_in: LocationCreate) -> Location:
    loc = Location(
        community_id=community_id,
        building_id=loc_in.building_id,
        name=loc_in.name,
        room_number=loc_in.room_number,
        floor=loc_in.floor,
        description=loc_in.description,
        latitude=loc_in.latitude,
        longitude=loc_in.longitude,
        x_coordinate=loc_in.x_coordinate,
        y_coordinate=loc_in.y_coordinate,
        location_type=loc_in.location_type,
        is_accessible=loc_in.is_accessible,
    )
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return loc


def update_location(
    db: Session, community_id: str, location_id: str, loc_in: LocationUpdate
) -> Location:
    loc = get_location_by_id(db, community_id, location_id)
    update_data = loc_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(loc, field, value)
    db.commit()
    db.refresh(loc)
    return loc


def delete_location(db: Session, community_id: str, location_id: str) -> None:
    loc = get_location_by_id(db, community_id, location_id)
    db.delete(loc)
    db.commit()
