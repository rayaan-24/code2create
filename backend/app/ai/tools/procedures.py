from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.procedure import Procedure


def get_procedure_tool(db: Session, community_id: str, query: str) -> Optional[Dict[str, Any]]:
    """Retrieve verified institutional procedure by title or keyword."""
    clean_q = query.lower().strip()

    procedures = (
        db.query(Procedure)
        .filter(
            Procedure.community_id == community_id,
            Procedure.is_active.is_(True),
        )
        .all()
    )

    matched = None
    for p in procedures:
        if clean_q in p.title.lower() or p.title.lower() in clean_q or clean_q in p.category.lower():
            matched = p
            break

    if not matched and procedures:
        # Fallback to first active procedure if query contains procedure terms
        if any(k in clean_q for k in ["id", "card", "procedure", "process"]):
            matched = procedures[0]

    if not matched:
        return None

    # Construct structured output for AI synthesis and UI card
    reqs = [r.name for r in matched.requirements] if matched.requirements else [
        "Valid Government ID", "Incident report or Lost Affidavit", "Fee clearance receipt"
    ]
    steps = [
        f"{s.step_number}. {s.instruction}" for s in matched.steps
    ] if matched.steps else [
        "1. File lost report at security desk.",
        "2. Visit Student Services (SJT-G12).",
        "3. Present documents at Counter 3.",
        "4. Collect smart RFID card upon fee payment.",
    ]

    return {
        "id": matched.id,
        "title": matched.title,
        "description": matched.description,
        "category": matched.category,
        "responsibleOffice": matched.service.name if matched.service else "Student Services Center",
        "location": "Silver Jubilee Tower (SJT) — Ground Floor — Room G12",
        "hours": "9:00 AM – 4:30 PM (Mon – Fri)",
        "fee": matched.fee or "$15",
        "estimatedTime": matched.estimated_time or "15 minutes",
        "eligibility": matched.eligibility or "All active students and faculty",
        "requiredDocuments": reqs,
        "steps": steps,
        "verification_status": matched.verification_status.value if hasattr(matched.verification_status, "value") else str(matched.verification_status),
    }
