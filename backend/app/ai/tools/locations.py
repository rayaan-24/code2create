from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.location import Location


def get_location_tool(db: Session, community_id: str, query: str) -> Optional[Dict[str, Any]]:
    """Retrieve physical location, building, floor, room number, and accessibility."""
    clean_q = query.lower().strip()

    locations = (
        db.query(Location)
        .filter(
            Location.community_id == community_id,
        )
        .all()
    )

    matched = None
    for loc in locations:
        loc_name = loc.name.lower()
        loc_room = (loc.room_number or "").lower()
        if clean_q in loc_name or loc_name in clean_q or (loc_room and loc_room in clean_q):
            matched = loc
            break

    if not matched:
        # Check for keywords like "office", "services", "library", "lab"
        for loc in locations:
            if "student" in clean_q and "student" in loc.name.lower():
                matched = loc
                break
            elif "library" in clean_q and "library" in loc.name.lower():
                matched = loc
                break
            elif "quantum" in clean_q and "quantum" in loc.name.lower():
                matched = loc
                break

    if not matched:
        return None

    return {
        "id": matched.id,
        "name": matched.name,
        "building": matched.building_id or "Silver Jubilee Tower (SJT)",
        "floor": matched.floor or "Ground Floor",
        "room": matched.room_number or "Room G12",
        "category": matched.location_type or "Administration",
        "operatingHours": "9:00 AM – 4:30 PM (Mon – Fri)",
        "accessible": matched.is_accessible if matched.is_accessible is not None else True,
        "description": matched.description or "Central campus administrative facility.",
    }
