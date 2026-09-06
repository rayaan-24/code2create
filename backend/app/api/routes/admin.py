from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, Request, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.dependencies.permissions import require_admin
from app.models.user import User
from app.models.community import Building
from app.models.location import Location
from app.models.person import Person
from app.models.service import Service, ServiceHours
from app.models.procedure import (
    Procedure,
    VerificationStatus,
)
from app.models.document import Document
from app.models.announcement import Announcement
from app.models.audit import AuditLog, AuditAction
from app.schemas.response import ResponseEnvelope
from app.schemas.location import LocationCreate, LocationUpdate, LocationRead
from app.schemas.person import PersonCreate, PersonUpdate, PersonRead
from app.schemas.service import ServiceCreate, ServiceUpdate, ServiceRead
from app.schemas.procedure import (
    ProcedureCreate,
    ProcedureUpdate,
    ProcedureRead,
    ProcedureVerifyRequest,
)
from app.schemas.document import (
    DocumentCreate,
    DocumentRead,
    DocumentVerifyRequest,
    DocumentUploadNewVersion,
)
from app.schemas.announcement import (
    AnnouncementCreate,
    AnnouncementUpdate,
    AnnouncementRead,
)
from app.services.audit_service import log_audit_event
from app.services.location_service import (
    create_location,
    update_location,
    delete_location,
)
from app.services.procedure_service import (
    create_procedure,
    update_procedure,
    verify_procedure,
    delete_procedure,
)
from app.services.document_service import (
    create_document,
    upload_new_document_version,
    verify_document,
    delete_document,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/dashboard", response_model=ResponseEnvelope[Dict[str, Any]])
def get_admin_dashboard(
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    comm_id = current_admin.community_id

    total_users = db.query(User).filter(User.community_id == comm_id).count()
    total_locations = db.query(Location).filter(Location.community_id == comm_id).count()
    total_people = db.query(Person).filter(Person.community_id == comm_id).count()
    total_services = db.query(Service).filter(Service.community_id == comm_id).count()
    total_procedures = db.query(Procedure).filter(Procedure.community_id == comm_id).count()
    total_documents = db.query(Document).filter(Document.community_id == comm_id).count()

    verified_docs = (
        db.query(Document)
        .filter(
            Document.community_id == comm_id,
            Document.verification_status == VerificationStatus.VERIFIED,
        )
        .count()
    )
    pending_docs = (
        db.query(Document)
        .filter(
            Document.community_id == comm_id,
            Document.verification_status == VerificationStatus.PENDING,
        )
        .count()
    )
    expired_docs = (
        db.query(Document)
        .filter(
            Document.community_id == comm_id,
            Document.verification_status == VerificationStatus.EXPIRED,
        )
        .count()
    )
    active_announcements = (
        db.query(Announcement)
        .filter(Announcement.community_id == comm_id, Announcement.is_active == True)
        .count()
    )

    # Recent activity audit logs
    recent_logs = (
        db.query(AuditLog)
        .filter(AuditLog.community_id == comm_id)
        .order_by(AuditLog.created_at.desc())
        .limit(10)
        .all()
    )

    metrics = {
        "total_users": total_users,
        "total_locations": total_locations,
        "total_people": total_people,
        "total_services": total_services,
        "total_procedures": total_procedures,
        "total_documents": total_documents,
        "verified_documents": verified_docs,
        "pending_documents": pending_docs,
        "expired_documents": expired_docs,
        "active_announcements": active_announcements,
        "recent_activity": [
            {
                "id": log.id,
                "action": log.action.value,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "created_at": log.created_at.isoformat(),
            }
            for log in recent_logs
        ],
    }

    return ResponseEnvelope(data=metrics)


# ==================== VERIFICATION QUEUE ====================


@router.post("/procedures/{procedure_id}/verify", response_model=ResponseEnvelope[ProcedureRead])
def admin_verify_procedure(
    procedure_id: str,
    verify_in: ProcedureVerifyRequest,
    req: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    proc = verify_procedure(
        db=db,
        community_id=current_admin.community_id,
        procedure_id=procedure_id,
        verify_in=verify_in,
        admin_user_id=current_admin.id,
    )
    client_ip = req.client.host if req.client else "127.0.0.1"
    log_audit_event(
        db=db,
        community_id=current_admin.community_id,
        user_id=current_admin.id,
        action=AuditAction.VERIFY if verify_in.status == VerificationStatus.VERIFIED else AuditAction.REJECT,
        entity_type="procedure",
        entity_id=proc.id,
        metadata_json={"status": verify_in.status.value},
        ip_address=client_ip,
    )
    return ResponseEnvelope(data=ProcedureRead.model_validate(proc))


@router.post("/documents/{document_id}/verify", response_model=ResponseEnvelope[DocumentRead])
def admin_verify_document(
    document_id: str,
    verify_in: DocumentVerifyRequest,
    req: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    doc = verify_document(
        db=db,
        community_id=current_admin.community_id,
        document_id=document_id,
        verify_in=verify_in,
        admin_user_id=current_admin.id,
    )
    client_ip = req.client.host if req.client else "127.0.0.1"
    log_audit_event(
        db=db,
        community_id=current_admin.community_id,
        user_id=current_admin.id,
        action=AuditAction.VERIFY if verify_in.status == VerificationStatus.VERIFIED else AuditAction.REJECT,
        entity_type="document",
        entity_id=doc.id,
        metadata_json={"status": verify_in.status.value},
        ip_address=client_ip,
    )
    return ResponseEnvelope(data=DocumentRead.model_validate(doc))


# ==================== LOCATIONS CRUD ====================


@router.post("/locations", response_model=ResponseEnvelope[LocationRead])
def admin_create_location(
    loc_in: LocationCreate,
    req: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    loc = create_location(db, current_admin.community_id, loc_in)
    client_ip = req.client.host if req.client else "127.0.0.1"
    log_audit_event(
        db=db,
        community_id=current_admin.community_id,
        user_id=current_admin.id,
        action=AuditAction.CREATE,
        entity_type="location",
        entity_id=loc.id,
        metadata_json={"name": loc.name},
        ip_address=client_ip,
    )
    return ResponseEnvelope(data=LocationRead.model_validate(loc))


@router.put("/locations/{location_id}", response_model=ResponseEnvelope[LocationRead])
def admin_update_location(
    location_id: str,
    loc_in: LocationUpdate,
    req: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    loc = update_location(db, current_admin.community_id, location_id, loc_in)
    client_ip = req.client.host if req.client else "127.0.0.1"
    log_audit_event(
        db=db,
        community_id=current_admin.community_id,
        user_id=current_admin.id,
        action=AuditAction.UPDATE,
        entity_type="location",
        entity_id=loc.id,
        ip_address=client_ip,
    )
    return ResponseEnvelope(data=LocationRead.model_validate(loc))


@router.delete("/locations/{location_id}", response_model=ResponseEnvelope[dict])
def admin_delete_location(
    location_id: str,
    req: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    delete_location(db, current_admin.community_id, location_id)
    client_ip = req.client.host if req.client else "127.0.0.1"
    log_audit_event(
        db=db,
        community_id=current_admin.community_id,
        user_id=current_admin.id,
        action=AuditAction.DELETE,
        entity_type="location",
        entity_id=location_id,
        ip_address=client_ip,
    )
    return ResponseEnvelope(data={"message": "Location deleted successfully"})


# ==================== PEOPLE CRUD ====================


@router.post("/people", response_model=ResponseEnvelope[PersonRead])
def admin_create_person(
    person_in: PersonCreate,
    req: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    person = Person(
        community_id=current_admin.community_id,
        name=person_in.name,
        role=person_in.role,
        department=person_in.department,
        email=person_in.email,
        phone=person_in.phone,
        location_id=person_in.location_id,
        description=person_in.description,
        office_hours=person_in.office_hours,
        availability=person_in.availability,
        avatar_url=person_in.avatar_url,
        is_active=person_in.is_active,
    )
    db.add(person)
    db.commit()
    db.refresh(person)

    client_ip = req.client.host if req.client else "127.0.0.1"
    log_audit_event(
        db=db,
        community_id=current_admin.community_id,
        user_id=current_admin.id,
        action=AuditAction.CREATE,
        entity_type="person",
        entity_id=person.id,
        metadata_json={"name": person.name},
        ip_address=client_ip,
    )
    return ResponseEnvelope(data=PersonRead.model_validate(person))


@router.put("/people/{person_id}", response_model=ResponseEnvelope[PersonRead])
def admin_update_person(
    person_id: str,
    person_in: PersonUpdate,
    req: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    person = (
        db.query(Person)
        .filter(Person.id == person_id, Person.community_id == current_admin.community_id)
        .first()
    )
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "Person not found"},
        )
    update_data = person_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(person, field, value)
    db.commit()
    db.refresh(person)

    client_ip = req.client.host if req.client else "127.0.0.1"
    log_audit_event(
        db=db,
        community_id=current_admin.community_id,
        user_id=current_admin.id,
        action=AuditAction.UPDATE,
        entity_type="person",
        entity_id=person.id,
        ip_address=client_ip,
    )
    return ResponseEnvelope(data=PersonRead.model_validate(person))


@router.delete("/people/{person_id}", response_model=ResponseEnvelope[dict])
def admin_delete_person(
    person_id: str,
    req: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    person = (
        db.query(Person)
        .filter(Person.id == person_id, Person.community_id == current_admin.community_id)
        .first()
    )
    if not person:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "Person not found"},
        )
    db.delete(person)
    db.commit()

    client_ip = req.client.host if req.client else "127.0.0.1"
    log_audit_event(
        db=db,
        community_id=current_admin.community_id,
        user_id=current_admin.id,
        action=AuditAction.DELETE,
        entity_type="person",
        entity_id=person_id,
        ip_address=client_ip,
    )
    return ResponseEnvelope(data={"message": "Person deleted successfully"})


# ==================== SERVICES CRUD ====================


@router.post("/services", response_model=ResponseEnvelope[ServiceRead])
def admin_create_service(
    srv_in: ServiceCreate,
    req: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    srv = Service(
        community_id=current_admin.community_id,
        name=srv_in.name,
        description=srv_in.description,
        department=srv_in.department,
        category=srv_in.category,
        location_id=srv_in.location_id,
        contact=srv_in.contact,
        website=srv_in.website,
        is_urgent=srv_in.is_urgent,
        is_active=srv_in.is_active,
    )
    db.add(srv)
    db.commit()
    db.refresh(srv)

    if srv_in.hours:
        for h in srv_in.hours:
            sh = ServiceHours(
                service_id=srv.id,
                day_of_week=h.day_of_week,
                open_time=h.open_time,
                close_time=h.close_time,
                is_closed=h.is_closed,
            )
            db.add(sh)
        db.commit()
        db.refresh(srv)

    client_ip = req.client.host if req.client else "127.0.0.1"
    log_audit_event(
        db=db,
        community_id=current_admin.community_id,
        user_id=current_admin.id,
        action=AuditAction.CREATE,
        entity_type="service",
        entity_id=srv.id,
        metadata_json={"name": srv.name},
        ip_address=client_ip,
    )
    return ResponseEnvelope(data=ServiceRead.model_validate(srv))


@router.delete("/services/{service_id}", response_model=ResponseEnvelope[dict])
def admin_delete_service(
    service_id: str,
    req: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    srv = (
        db.query(Service)
        .filter(Service.id == service_id, Service.community_id == current_admin.community_id)
        .first()
    )
    if not srv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "Service not found"},
        )
    db.delete(srv)
    db.commit()

    client_ip = req.client.host if req.client else "127.0.0.1"
    log_audit_event(
        db=db,
        community_id=current_admin.community_id,
        user_id=current_admin.id,
        action=AuditAction.DELETE,
        entity_type="service",
        entity_id=service_id,
        ip_address=client_ip,
    )
    return ResponseEnvelope(data={"message": "Service deleted successfully"})


# ==================== PROCEDURES CRUD ====================


@router.post("/procedures", response_model=ResponseEnvelope[ProcedureRead])
def admin_create_procedure(
    proc_in: ProcedureCreate,
    req: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    proc = create_procedure(db, current_admin.community_id, proc_in)
    client_ip = req.client.host if req.client else "127.0.0.1"
    log_audit_event(
        db=db,
        community_id=current_admin.community_id,
        user_id=current_admin.id,
        action=AuditAction.CREATE,
        entity_type="procedure",
        entity_id=proc.id,
        metadata_json={"title": proc.title},
        ip_address=client_ip,
    )
    return ResponseEnvelope(data=ProcedureRead.model_validate(proc))


@router.delete("/procedures/{procedure_id}", response_model=ResponseEnvelope[dict])
def admin_delete_procedure(
    procedure_id: str,
    req: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    delete_procedure(db, current_admin.community_id, procedure_id)
    client_ip = req.client.host if req.client else "127.0.0.1"
    log_audit_event(
        db=db,
        community_id=current_admin.community_id,
        user_id=current_admin.id,
        action=AuditAction.DELETE,
        entity_type="procedure",
        entity_id=procedure_id,
        ip_address=client_ip,
    )
    return ResponseEnvelope(data={"message": "Procedure deleted successfully"})


# ==================== DOCUMENTS CRUD ====================


@router.post("/documents", response_model=ResponseEnvelope[DocumentRead])
def admin_create_document(
    doc_in: DocumentCreate,
    req: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    doc = create_document(db, current_admin.community_id, doc_in, current_admin.id)
    client_ip = req.client.host if req.client else "127.0.0.1"
    log_audit_event(
        db=db,
        community_id=current_admin.community_id,
        user_id=current_admin.id,
        action=AuditAction.CREATE,
        entity_type="document",
        entity_id=doc.id,
        metadata_json={"title": doc.title},
        ip_address=client_ip,
    )
    return ResponseEnvelope(data=DocumentRead.model_validate(doc))


@router.post("/documents/{document_id}/version", response_model=ResponseEnvelope[DocumentRead])
def admin_upload_version(
    document_id: str,
    version_in: DocumentUploadNewVersion,
    req: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    doc = upload_new_document_version(
        db, current_admin.community_id, document_id, version_in, current_admin.id
    )
    client_ip = req.client.host if req.client else "127.0.0.1"
    log_audit_event(
        db=db,
        community_id=current_admin.community_id,
        user_id=current_admin.id,
        action=AuditAction.UPDATE,
        entity_type="document_version",
        entity_id=doc.id,
        metadata_json={"new_version": doc.version},
        ip_address=client_ip,
    )
    return ResponseEnvelope(data=DocumentRead.model_validate(doc))


@router.delete("/documents/{document_id}", response_model=ResponseEnvelope[dict])
def admin_delete_document(
    document_id: str,
    req: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    delete_document(db, current_admin.community_id, document_id)
    client_ip = req.client.host if req.client else "127.0.0.1"
    log_audit_event(
        db=db,
        community_id=current_admin.community_id,
        user_id=current_admin.id,
        action=AuditAction.DELETE,
        entity_type="document",
        entity_id=document_id,
        ip_address=client_ip,
    )
    return ResponseEnvelope(data={"message": "Document removed successfully"})


# ==================== ANNOUNCEMENTS CRUD ====================


@router.post("/announcements", response_model=ResponseEnvelope[AnnouncementRead])
def admin_create_announcement(
    ann_in: AnnouncementCreate,
    req: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ann = Announcement(
        community_id=current_admin.community_id,
        title=ann_in.title,
        content=ann_in.content,
        category=ann_in.category,
        priority=ann_in.priority,
        published_at=ann_in.published_at or datetime.now(timezone.utc),
        expires_at=ann_in.expires_at,
        created_by=current_admin.id,
        is_active=ann_in.is_active,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)

    client_ip = req.client.host if req.client else "127.0.0.1"
    log_audit_event(
        db=db,
        community_id=current_admin.community_id,
        user_id=current_admin.id,
        action=AuditAction.CREATE,
        entity_type="announcement",
        entity_id=ann.id,
        metadata_json={"title": ann.title, "priority": ann.priority.value},
        ip_address=client_ip,
    )
    return ResponseEnvelope(data=AnnouncementRead.model_validate(ann))


@router.delete("/announcements/{announcement_id}", response_model=ResponseEnvelope[dict])
def admin_delete_announcement(
    announcement_id: str,
    req: Request,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    ann = (
        db.query(Announcement)
        .filter(
            Announcement.id == announcement_id,
            Announcement.community_id == current_admin.community_id,
        )
        .first()
    )
    if not ann:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "RESOURCE_NOT_FOUND", "message": "Announcement not found"},
        )
    db.delete(ann)
    db.commit()

    client_ip = req.client.host if req.client else "127.0.0.1"
    log_audit_event(
        db=db,
        community_id=current_admin.community_id,
        user_id=current_admin.id,
        action=AuditAction.DELETE,
        entity_type="announcement",
        entity_id=announcement_id,
        ip_address=client_ip,
    )
    return ResponseEnvelope(data={"message": "Announcement deleted successfully"})


# ==================== AUDIT LOGS ====================


@router.get("/audit-logs", response_model=ResponseEnvelope[List[Dict[str, Any]]])
def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.community_id == current_admin.community_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return ResponseEnvelope(
        data=[
            {
                "id": l.id,
                "user_id": l.user_id,
                "action": l.action.value,
                "entity_type": l.entity_type,
                "entity_id": l.entity_id,
                "metadata": l.metadata_json,
                "ip_address": l.ip_address,
                "created_at": l.created_at.isoformat(),
            }
            for l in logs
        ]
    )
