from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.person import Person


def get_person_tool(db: Session, community_id: str, query: str, user_role: str = "USER") -> Optional[Dict[str, Any]]:
    """Retrieve faculty or staff directory record with privacy controls."""
    clean_q = query.lower().strip()

    people = (
        db.query(Person)
        .filter(
            Person.community_id == community_id,
            Person.is_active.is_(True),
        )
        .all()
    )

    matched = None
    for p in people:
        if clean_q in p.name.lower() or p.name.lower() in clean_q or clean_q in p.role.lower() or clean_q in p.department.lower():
            matched = p
            break

    if not matched:
        return None

    # Privacy filter: regular users see official public contact info
    phone_number = matched.phone if user_role in ["ADMIN", "SUPER_ADMIN", "STAFF"] else "+1 (555) CAMPUS-DESK"

    return {
        "id": matched.id,
        "name": matched.name,
        "role": matched.role,
        "department": matched.department,
        "email": matched.email,
        "phone": phone_number,
        "office": matched.location_id or "Room SJT-318",
        "building": "Silver Jubilee Tower",
        "availability": matched.availability or "Available",
        "officeHours": matched.office_hours or "Tue, Thu 2:00 PM - 4:00 PM",
        "avatar": matched.avatar_url or "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    }
