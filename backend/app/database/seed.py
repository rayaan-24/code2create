import sys
import os
from datetime import datetime, timezone, timedelta

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.database.session import SessionLocal, engine
from app.database.base import Base
import app.models  # Register all models

from app.core.security import hash_password
from app.models.community import Community, Building, CommunityType
from app.models.user import User, UserRole
from app.models.location import Location
from app.models.person import Person
from app.models.service import Service, ServiceHours
from app.models.procedure import (
    Procedure,
    ProcedureStep,
    ProcedureRequirement,
    VerificationStatus,
)
from app.models.document import Document, DocumentVersion
from app.models.announcement import Announcement, AnnouncementPriority
from app.models.audit import AuditLog, AuditAction
from app.services.audit_service import log_audit_event


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        print("[INFO] Seeding Nexora demo community database...")

        # 1. Check if already seeded
        existing_comm = (
            db.query(Community)
            .filter(Community.name == "Nexora Institute of Technology")
            .first()
        )
        if existing_comm:
            print("[INFO] Community already seeded.")
            return

        # 2. Create Community
        community = Community(
            name="Nexora Institute of Technology",
            type=CommunityType.UNIVERSITY,
            description="Premier technological research university and intelligent campus community.",
            logo_url="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=200&auto=format&fit=crop&q=80",
            timezone="UTC",
            is_active=True,
        )
        db.add(community)
        db.commit()
        db.refresh(community)

        # 3. Create Key Accounts
        # Admin
        admin_user = User(
            community_id=community.id,
            name="Campus Administrator",
            email="admin@nexora.edu",
            password_hash=hash_password("Admin@123456"),
            role=UserRole.ADMIN,
            department="Office of Campus Administration",
            is_active=True,
        )
        # Student
        student_user = User(
            community_id=community.id,
            name="Alex Rivera",
            email="alex.rivera@nexora.edu",
            password_hash=hash_password("Student@123456"),
            role=UserRole.USER,
            department="Computer Science & AI",
            year="Year 3",
            is_active=True,
        )
        # Faculty
        faculty_user = User(
            community_id=community.id,
            name="Dr. Elena Rostova",
            email="elena.rostova@nexora.edu",
            password_hash=hash_password("Faculty@123456"),
            role=UserRole.FACULTY,
            department="Computer Science & AI",
            is_active=True,
        )
        db.add_all([admin_user, student_user, faculty_user])
        db.commit()
        db.refresh(admin_user)
        db.refresh(student_user)
        db.refresh(faculty_user)

        # 4. Create Buildings
        b_admin = Building(
            community_id=community.id,
            name="Main Administrative Center",
            code="MB",
            description="Executive leadership, registry, bursar, and chancellor offices.",
        )
        b_sjt = Building(
            community_id=community.id,
            name="Silver Jubilee Tower",
            code="SJT",
            description="Flagship 7-story academic tower housing computing, labs, and student services.",
        )
        b_lib = Building(
            community_id=community.id,
            name="Nexora Central Library",
            code="LIB",
            description="24-hour learning commons, archival vaults, and multimedia suites.",
        )
        b_cat = Building(
            community_id=community.id,
            name="Center for Applied Technology",
            code="CAT",
            description="Hardware engineering, server rooms, and IT network operations center.",
        )
        b_health = Building(
            community_id=community.id,
            name="Campus Health & Recreation Pavilion",
            code="HWC",
            description="Outpatient medical clinic, psychological counseling, and wellness gym.",
        )
        db.add_all([b_admin, b_sjt, b_lib, b_cat, b_health])
        db.commit()

        # 5. Create Locations
        loc_sjt_g12 = Location(
            community_id=community.id,
            building_id=b_sjt.id,
            name="Student Services Center",
            room_number="G12",
            floor="Ground Floor",
            description="Front counter for ID card re-issuance, official bonafide certificates, and student inquiries.",
            x_coordinate=460.0,
            y_coordinate=310.0,
            location_type="office",
            is_accessible=True,
        )
        loc_sjt_312 = Location(
            community_id=community.id,
            building_id=b_sjt.id,
            name="Quantum Computing & Information Lab",
            room_number="Room 312",
            floor="3rd Floor",
            description="Cryogenic testbeds and simulated Qiskit hardware nodes.",
            x_coordinate=220.0,
            y_coordinate=180.0,
            location_type="lab",
            is_accessible=True,
        )
        loc_cat_102 = Location(
            community_id=community.id,
            building_id=b_cat.id,
            name="IT Helpdesk & Single Sign-On Support",
            room_number="T-102",
            floor="1st Floor",
            description="Device authentication, WiFi certificates, and laptop repair desk.",
            location_type="service_desk",
            is_accessible=True,
        )
        loc_hwc_104 = Location(
            community_id=community.id,
            building_id=b_health.id,
            name="Emergency Medical Triage Bay",
            room_number="H-104",
            floor="Ground Floor",
            description="Immediate medical first response, nursing station, and EMT ambulance bay.",
            location_type="clinic",
            is_accessible=True,
        )
        loc_lib_main = Location(
            community_id=community.id,
            building_id=b_lib.id,
            name="Central Library Information Commons",
            room_number="Main Concourse",
            floor="Level 1",
            description="Reference desks, study carrels, and book borrowing scanners.",
            x_coordinate=60.0,
            y_coordinate=80.0,
            location_type="library",
            is_accessible=True,
        )
        db.add_all([loc_sjt_g12, loc_sjt_312, loc_cat_102, loc_hwc_104, loc_lib_main])
        db.commit()

        # 6. Create People
        p1 = Person(
            community_id=community.id,
            name="Dr. Elena Rostova",
            role="Professor & Lead Scientist",
            department="Computer Science & AI",
            email="elena.rostova@nexora.edu",
            phone="+1 (555) 019-2831",
            location_id=loc_sjt_312.id,
            office_hours="Tue, Thu 2:00 PM - 4:00 PM",
            availability="Available",
            avatar_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
            description="Specializing in quantum fault-tolerance and topological qubit compilers.",
        )
        p2 = Person(
            community_id=community.id,
            name="Prof. Marcus Vance",
            role="Dean of Academic Affairs",
            department="Academic Administration",
            email="marcus.vance@nexora.edu",
            phone="+1 (555) 019-4412",
            office_hours="Wed 10:00 AM - 12:00 PM by appointment",
            availability="Busy",
            avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
            description="Overseeing curriculum review, graduation clearance, and term calendars.",
        )
        p3 = Person(
            community_id=community.id,
            name="Sarah Chen, M.S.",
            role="Senior Systems Administrator",
            department="IT Infrastructure",
            email="sarah.chen@nexora.edu",
            phone="+1 (555) 019-7819",
            location_id=loc_cat_102.id,
            office_hours="Mon-Fri 9:00 AM - 5:00 PM",
            availability="Available",
            avatar_url="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
            description="Administering campus identity federation, LDAP, and high-performance clusters.",
        )
        p4 = Person(
            community_id=community.id,
            name="Clara Oswald",
            role="Lead Student Wellness Counselor",
            department="Health & Wellness Center",
            email="clara.oswald@nexora.edu",
            phone="+1 (555) 019-3321",
            location_id=loc_hwc_104.id,
            office_hours="Daily 11:00 AM - 3:00 PM",
            availability="Office Hours Only",
            avatar_url="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
            description="Licensed therapist providing confidential psychological triage and academic stress coaching.",
        )
        db.add_all([p1, p2, p3, p4])
        db.commit()

        # 7. Create Services & Structured Hours
        srv_student = Service(
            community_id=community.id,
            name="Student Services & ID Center",
            description="Assisting with smart RFID cards, bonafide letters, term registration, and bursar payment receipts.",
            department="Student Affairs",
            category="Student Services",
            location_id=loc_sjt_g12.id,
            contact="studentservices@nexora.edu",
            is_urgent=False,
            is_active=True,
        )
        srv_health = Service(
            community_id=community.id,
            name="Emergency Medical & Ambulance Dispatch",
            description="On-campus 24/7 urgent medical triage, paramedic dispatch, first aid, and pharmacy dispensing.",
            department="University Health Service",
            category="Health & Emergency",
            location_id=loc_hwc_104.id,
            contact="emergency-health@nexora.edu",
            is_urgent=True,
            is_active=True,
        )
        srv_it = Service(
            community_id=community.id,
            name="IT Network, VPN & Single Sign-On Support",
            description="Authentication support, eduroam Wi-Fi configuration, software licensing, and device repairs.",
            department="IT Infrastructure",
            category="IT & Labs",
            location_id=loc_cat_102.id,
            contact="itsupport@nexora.edu",
            is_urgent=False,
            is_active=True,
        )
        db.add_all([srv_student, srv_health, srv_it])
        db.commit()

        # Structured service hours (Mon-Fri 9-5 for student services)
        for day in range(5):
            h = ServiceHours(
                service_id=srv_student.id,
                day_of_week=day,
                open_time="09:00",
                close_time="16:30",
                is_closed=False,
            )
            db.add(h)
        # Saturday & Sunday closed
        db.add(ServiceHours(service_id=srv_student.id, day_of_week=5, is_closed=True))
        db.add(ServiceHours(service_id=srv_student.id, day_of_week=6, is_closed=True))
        db.commit()

        # 8. Create Procedures with Steps & Requirements
        proc_id = Procedure(
            community_id=community.id,
            service_id=srv_student.id,
            title="Student ID Card Replacement",
            description="Official institutional procedure to report, settle fees, and print an RFID smart card replacement.",
            category="Student Services",
            fee="$15.00 USD",
            estimated_time="15 minutes",
            eligibility="All currently enrolled students and active postgraduates.",
            verification_status=VerificationStatus.VERIFIED,
            verified_by=admin_user.id,
            verified_at=datetime.now(timezone.utc),
            review_due_at=datetime.now(timezone.utc) + timedelta(days=180),
            is_active=True,
        )
        db.add(proc_id)
        db.commit()
        db.refresh(proc_id)

        # Steps
        steps = [
            (1, "File the digital lost property declaration at Campus Security or through the portal."),
            (2, "Visit the Student Services Center (Silver Jubilee Tower, Room G12)."),
            (3, "Present official photo identification and term enrollment confirmation at Counter 3."),
            (4, "Settle the $15 card replacement administrative fee via card or digital campus wallet."),
            (5, "Complete biometrics capture and collect the active RFID smart card."),
        ]
        for num, inst in steps:
            db.add(ProcedureStep(procedure_id=proc_id.id, step_number=num, instruction=inst))

        # Requirements
        reqs = [
            ("Original Government ID", "Passport, State Driver's License, or National Identity Card.", True),
            ("Enrollment Clearance Receipt", "Proof of current term tuition settlement.", True),
            ("Lost Property Affidavit", "Affidavit receipt from security desk.", True),
        ]
        for name, desc, req in reqs:
            db.add(ProcedureRequirement(procedure_id=proc_id.id, name=name, description=desc, required=req))

        db.commit()

        # 9. Create Documents & Versions
        doc_handbook = Document(
            community_id=community.id,
            title="Nexora Student Code of Conduct & Handbook 2026",
            description="Comprehensive rules, academic integrity regulations, and student rights.",
            file_name="student_handbook_2026.pdf",
            file_type="application/pdf",
            storage_key="s3://nexora-docs/handbook_v2.pdf",
            version=2,
            uploaded_by=admin_user.id,
            verification_status=VerificationStatus.VERIFIED,
            verified_by=admin_user.id,
            verified_at=datetime.now(timezone.utc),
            review_due_at=datetime.now(timezone.utc) + timedelta(days=365),
            is_active=True,
        )
        db.add(doc_handbook)
        db.commit()
        db.refresh(doc_handbook)

        ver1 = DocumentVersion(
            document_id=doc_handbook.id,
            version_number=1,
            file_name="student_handbook_2025.pdf",
            uploaded_by=admin_user.id,
            change_summary="Initial 2025 handbook release.",
        )
        ver2 = DocumentVersion(
            document_id=doc_handbook.id,
            version_number=2,
            file_name="student_handbook_2026.pdf",
            uploaded_by=admin_user.id,
            change_summary="Updated Section 4.2 regarding digital RFID credentials and emergency contacts.",
        )
        db.add_all([ver1, ver2])
        db.commit()

        # Pending document example for verification queue demo
        doc_lab = Document(
            community_id=community.id,
            title="Overnight Quantum Laboratory Safety Protocol",
            description="Mandatory protocols and safety escorts for post-11 PM lab usage.",
            file_name="quantum_safety_protocol.pdf",
            file_type="application/pdf",
            version=1,
            uploaded_by=faculty_user.id,
            verification_status=VerificationStatus.PENDING,
            is_active=True,
        )
        db.add(doc_lab)
        db.commit()

        # 10. Announcements
        ann1 = Announcement(
            community_id=community.id,
            title="Campus-wide Fiber Network Maintenance Tonight",
            content="Brief intermittent Wi-Fi disruption expected between 1:00 AM and 2:30 AM tonight due to core switch upgrade.",
            category="IT Infrastructure",
            priority=AnnouncementPriority.NORMAL,
            created_by=admin_user.id,
            is_active=True,
        )
        ann2 = Announcement(
            community_id=community.id,
            title="Seasonal Flu Vaccination Clinic at Health Pavilion",
            content="Free seasonal flu and booster shots available this Wednesday and Thursday from 9:00 AM to 4:00 PM for all community members.",
            category="Health",
            priority=AnnouncementPriority.IMPORTANT,
            created_by=admin_user.id,
            is_active=True,
        )
        db.add_all([ann1, ann2])
        db.commit()

        # 11. Initial Audit Logs
        log_audit_event(
            db=db,
            community_id=community.id,
            user_id=admin_user.id,
            action=AuditAction.CREATE,
            entity_type="community",
            entity_id=community.id,
            metadata_json={"seed": True},
            ip_address="127.0.0.1",
        )
        log_audit_event(
            db=db,
            community_id=community.id,
            user_id=admin_user.id,
            action=AuditAction.VERIFY,
            entity_type="procedure",
            entity_id=proc_id.id,
            metadata_json={"status": "VERIFIED"},
            ip_address="127.0.0.1",
        )

        print("[SUCCESS] Nexora database successfully seeded with demo community, accounts, locations, services, and procedures.")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to seed database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
