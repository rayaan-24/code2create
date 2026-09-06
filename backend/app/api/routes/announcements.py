import math
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.announcement import Announcement, AnnouncementPriority
from app.schemas.announcement import AnnouncementRead
from app.schemas.response import ResponseEnvelope

router = APIRouter(prefix="/announcements", tags=["Announcements"])


@router.get("", response_model=ResponseEnvelope[List[AnnouncementRead]])
def list_announcements(
    category: Optional[str] = Query(None),
    priority: Optional[AnnouncementPriority] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Announcement).filter(
        Announcement.community_id == current_user.community_id,
        Announcement.is_active == True,
    )

    if category and category != "All":
        query = query.filter(Announcement.category.ilike(f"%{category}%"))

    if priority:
        query = query.filter(Announcement.priority == priority)

    query = query.order_by(Announcement.created_at.desc())
    total = query.count()
    offset = (page - 1) * page_size
    announcements = query.offset(offset).limit(page_size).all()

    return ResponseEnvelope(
        data=[AnnouncementRead.model_validate(a) for a in announcements],
        meta={
            "page": page,
            "page_size": page_size,
            "total_items": total,
            "total_pages": math.ceil(total / page_size) if page_size > 0 else 1,
        },
    )


@router.get("/{announcement_id}", response_model=ResponseEnvelope[AnnouncementRead])
def get_announcement(
    announcement_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    announcement = (
        db.query(Announcement)
        .filter(
            Announcement.id == announcement_id,
            Announcement.community_id == current_user.community_id,
        )
        .first()
    )
    if not announcement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "Announcement not found"},
        )
    return ResponseEnvelope(data=AnnouncementRead.model_validate(announcement))
