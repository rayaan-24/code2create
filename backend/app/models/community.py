import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import String, DateTime, Boolean, Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base


class CommunityType(str, Enum):
    UNIVERSITY = "UNIVERSITY"
    HOSPITAL = "HOSPITAL"
    CORPORATE = "CORPORATE"
    RESIDENTIAL = "RESIDENTIAL"
    ORGANIZATION = "ORGANIZATION"


class Community(Base):
    __tablename__ = "communities"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    type: Mapped[CommunityType] = mapped_column(
        SQLEnum(CommunityType), nullable=False, default=CommunityType.UNIVERSITY
    )
    description: Mapped[str] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str] = mapped_column(String(512), nullable=True)
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    buildings: Mapped[list["Building"]] = relationship(
        "Building", back_populates="community", cascade="all, delete-orphan"
    )
    users: Mapped[list["User"]] = relationship(
        "User", back_populates="community", cascade="all, delete-orphan"
    )
    locations: Mapped[list["Location"]] = relationship(
        "Location", back_populates="community", cascade="all, delete-orphan"
    )
    people: Mapped[list["Person"]] = relationship(
        "Person", back_populates="community", cascade="all, delete-orphan"
    )
    services: Mapped[list["Service"]] = relationship(
        "Service", back_populates="community", cascade="all, delete-orphan"
    )
    documents: Mapped[list["Document"]] = relationship(
        "Document", back_populates="community", cascade="all, delete-orphan"
    )
    announcements: Mapped[list["Announcement"]] = relationship(
        "Announcement", back_populates="community", cascade="all, delete-orphan"
    )


class Building(Base):
    __tablename__ = "buildings"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    community_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("communities.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(32), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    community: Mapped["Community"] = relationship("Community", back_populates="buildings")
    locations: Mapped[list["Location"]] = relationship(
        "Location", back_populates="building", cascade="all, delete-orphan"
    )
