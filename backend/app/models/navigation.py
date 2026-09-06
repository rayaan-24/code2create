import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey, Enum as SQLEnum, Index, DateTime
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.database.base import Base


class NodeType(str, enum.Enum):
    ENTRANCE = "ENTRANCE"
    CORRIDOR = "CORRIDOR"
    ROOM = "ROOM"
    STAIR = "STAIR"
    ELEVATOR = "ELEVATOR"
    LANDMARK = "LANDMARK"
    INTERSECTION = "INTERSECTION"
    EXIT = "EXIT"


class NavigationNode(Base):
    """
    Physical wayfinding node inside a closed community building/campus.
    Coordinates x and y are in normalized local space (0 to 1000).
    """
    __tablename__ = "navigation_nodes"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    community_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    building_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    floor: Mapped[str] = mapped_column(String(50), nullable=False, default="Ground Floor")
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    node_type: Mapped[NodeType] = mapped_column(SQLEnum(NodeType), default=NodeType.CORRIDOR, nullable=False)
    x: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    y: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    is_accessible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    location_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("locations.id", ondelete="SET NULL"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    community = relationship("Community")
    location = relationship("Location")

    outgoing_edges = relationship(
        "NavigationEdge",
        foreign_keys="NavigationEdge.source_node_id",
        back_populates="source_node",
        cascade="all, delete-orphan",
    )
    incoming_edges = relationship(
        "NavigationEdge",
        foreign_keys="NavigationEdge.destination_node_id",
        back_populates="destination_node",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index("idx_nav_nodes_community_building_floor", "community_id", "building_id", "floor"),
    )


class NavigationEdge(Base):
    """
    Directional or bidirectional walkable path connecting two navigation nodes.
    """
    __tablename__ = "navigation_edges"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    community_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_node_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("navigation_nodes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    destination_node_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("navigation_nodes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    distance: Mapped[float] = mapped_column(Float, nullable=False, default=10.0)  # Distance in meters
    accessible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    stairs_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    elevator_available: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    bidirectional: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    source_node = relationship("NavigationNode", foreign_keys=[source_node_id], back_populates="outgoing_edges")
    destination_node = relationship("NavigationNode", foreign_keys=[destination_node_id], back_populates="incoming_edges")
