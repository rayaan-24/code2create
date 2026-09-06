from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.service import Service


def get_service_tool(db: Session, community_id: str, query: str) -> Optional[Dict[str, Any]]:
    """Retrieve institutional service record with hours and contacts."""
    clean_q = query.lower().strip()

    services = (
        db.query(Service)
        .filter(
            Service.community_id == community_id,
            Service.is_active.is_(True),
        )
        .all()
    )

    matched = None
    for s in services:
        if clean_q in s.name.lower() or s.name.lower() in clean_q or clean_q in s.department.lower():
            matched = s
            break

    if not matched:
        return None

    hours_desc = "9:00 AM – 5:00 PM (Mon – Fri)"
    if matched.hours:
        hours_desc = "Regular operating hours"

    return {
        "id": matched.id,
        "name": matched.name,
        "description": matched.description,
        "category": matched.category or "Student Services",
        "department": matched.department,
        "location": matched.location_id or "Student Services Center (SJT-G12)",
        "hours": hours_desc,
        "contactEmail": matched.contact or "support@nexora.edu",
        "isUrgent": matched.is_urgent,
    }
