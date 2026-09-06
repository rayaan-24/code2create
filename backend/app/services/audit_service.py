from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditLog, AuditAction


def log_audit_event(
    db: Session,
    community_id: str,
    action: AuditAction,
    entity_type: str,
    entity_id: Optional[str] = None,
    user_id: Optional[str] = None,
    metadata_json: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    log_entry = AuditLog(
        community_id=community_id,
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata_json=metadata_json or {},
        ip_address=ip_address,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
