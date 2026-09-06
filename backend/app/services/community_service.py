from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.community import Community, Building
from app.schemas.community import CommunityCreate, CommunityUpdate, BuildingCreate


def get_community_by_id(db: Session, community_id: str) -> Community:
    community = db.query(Community).filter(Community.id == community_id).first()
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "Community not found"},
        )
    return community


def get_buildings_for_community(db: Session, community_id: str) -> List[Building]:
    return db.query(Building).filter(Building.community_id == community_id).all()


def create_building_for_community(
    db: Session, community_id: str, building_in: BuildingCreate
) -> Building:
    get_community_by_id(db, community_id)
    building = Building(
        community_id=community_id,
        name=building_in.name,
        code=building_in.code,
        description=building_in.description,
    )
    db.add(building)
    db.commit()
    db.refresh(building)
    return building
