from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.community import CommunityRead, BuildingRead
from app.schemas.response import ResponseEnvelope
from app.services.community_service import (
    get_community_by_id,
    get_buildings_for_community,
)

router = APIRouter(prefix="/communities", tags=["Communities"])


@router.get("/current", response_model=ResponseEnvelope[CommunityRead])
def get_current_community(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    community = get_community_by_id(db, current_user.community_id)
    return ResponseEnvelope(data=CommunityRead.model_validate(community))


@router.get("/current/buildings", response_model=ResponseEnvelope[List[BuildingRead]])
def get_current_community_buildings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    buildings = get_buildings_for_community(db, current_user.community_id)
    return ResponseEnvelope(
        data=[BuildingRead.model_validate(b) for b in buildings]
    )
