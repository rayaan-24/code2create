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
from app.models.chunk import KnowledgeChunk
from app.models.navigation import NavigationNode, NavigationEdge, NodeType
from app.ai.retrieval.embeddings import embedding_provider
from app.services.audit_service import log_audit_event


def seed_knowledge_chunks(db, community, doc_handbook=None, doc_lab=None):
    if not doc_handbook:
        doc_handbook = db.query(Document).filter(Document.community_id == community.id).first()
    if not doc_lab:
        doc_lab = db.query(Document).filter(Document.community_id == community.id).order_by(Document.created_at.desc()).first()

    doc_hb_id = doc_handbook.id if doc_handbook else None
    doc_lab_id = doc_lab.id if doc_lab else None
    hb_title = doc_handbook.title if doc_handbook else "Student Handbook 2026"
    lab_title = doc_lab.title if doc_lab else "Quantum Lab Safety Protocol"

    sample_chunks = [
        {
            "content": (
                "Student ID Card Replacement Procedure (Handbook Section 4.2):\n"
                "If a student or staff member loses their RFID institutional ID card, they must report the lost item "
                "at the Campus Security desk. Then, proceed to the Student Services Center located in the Silver Jubilee Tower (SJT), "
                "Ground Floor, Room G12. Office hours are Monday through Friday, 9:00 AM to 4:30 PM.\n"
                "Requirements:\n"
                "1. Original Government Photo ID (Passport, Driver's License, or National ID)\n"
                "2. Campus Police Incident Log receipt or Lost Property Declaration\n"
                "3. Proof of active term enrollment and fee clearance receipt\n"
                "4. Passport-size photograph (can also be captured at the counter)\n"
                "A mandatory replacement card fee of $15 is charged upon processing. Replacement cards are issued within 15 minutes."
            ),
            "section": "Section 4.2: Identification Credentials",
            "page": 34,
            "doc_id": doc_hb_id,
            "doc_title": hb_title,
            "status": "VERIFIED",
        },
        {
            "content": (
                "Nexora Central Library Operating Hours and Guidelines (Handbook Section 3.1):\n"
                "The Central Library occupies Levels 1 through 4 of the Library & Information Commons. "
                "During active academic terms, the library operates 24 hours a day for registered students. "
                "Silent study carrels are located on Level 3 and Level 4. Group discussion pods are situated on Level 2. "
                "Wi-Fi networks 'Nexora-Secure' and 'eduroam' are available campus-wide."
            ),
            "section": "Section 3.1: Academic Facilities & Libraries",
            "page": 18,
            "doc_id": doc_hb_id,
            "doc_title": hb_title,
            "status": "VERIFIED",
        },
        {
            "content": (
                "Overnight Laboratory Access & Safety Escort Protocol:\n"
                "The Advanced Quantum Information & Computing Lab is situated on Floor 3 of the Silver Jubilee Tower (Room SJT-312). "
                "The faculty head is Dr. Elena Rostova. Regular lab hours are 8:00 AM to 8:00 PM.\n"
                "Students requiring post-11:00 PM overnight access must secure prior written authorization from the Department Head "
                "and must arrange a campus security safety escort when entering or departing after midnight."
            ),
            "section": "Section 2.1: Quantum Computing Lab Protocol",
            "page": 5,
            "doc_id": doc_lab_id,
            "doc_title": lab_title,
            "status": "VERIFIED",
        },
        {
            "content": (
                "Hostel Night-Out Permission Protocol (Handbook Section 6.5):\n"
                "Residential students planning overnight leave must submit an electronic leave pass on the Nexora Portal. "
                "Parental or guardian verification via one-time password (OTP) is mandatory prior to 8:30 PM on the date of departure. "
                "Emergency curfew contact number is +1 (555) 019-3321."
            ),
            "section": "Section 6.5: Residential Living",
            "page": 52,
            "doc_id": doc_hb_id,
            "doc_title": hb_title,
            "status": "VERIFIED",
        },
        {
            "content": (
                "Official Transcripts and Bonafide Certificates:\n"
                "Official student transcripts, grade cards, and bonafide enrollment certificates are issued by the "
                "Academic Registry located in the Main Administrative Center, Room MB-104. Operating hours are 9:30 AM to 4:00 PM on weekdays. "
                "Digital e-transcripts can be requested online with a 48-hour fulfillment window."
            ),
            "section": "Section 5.1: Academic Records",
            "page": 40,
            "doc_id": doc_hb_id,
            "doc_title": hb_title,
            "status": "VERIFIED",
        },
    ]

    for sc in sample_chunks:
        chunk_emb = embedding_provider.embed_text(sc["content"])
        chunk_rec = KnowledgeChunk(
            document_id=sc["doc_id"],
            community_id=community.id,
            content=sc["content"],
            page_number=sc["page"],
            section=sc["section"],
            verification_status=sc["status"],
        )
        chunk_rec.embedding = chunk_emb
        chunk_rec.metadata_dict = {
            "document_title": sc["doc_title"],
            "section": sc["section"],
            "page": sc["page"],
        }
        db.add(chunk_rec)

    db.commit()
    print("[SUCCESS] Seeded knowledge chunks for community RAG.")


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
            existing_chunks = db.query(KnowledgeChunk).filter(KnowledgeChunk.community_id == existing_comm.id).count()
            if existing_chunks == 0:
                print("[INFO] Community exists, but knowledge chunks are missing. Seeding chunks now...")
                seed_knowledge_chunks(db, existing_comm)
            else:
                print("[INFO] Community and knowledge chunks already seeded.")
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

        # 12. Seed Verified Knowledge Chunks for RAG
        sample_chunks = [
            {
                "content": (
                    "Student ID Card Replacement Procedure (Handbook Section 4.2):\n"
                    "If a student or staff member loses their RFID institutional ID card, they must report the lost item "
                    "at the Campus Security desk. Then, proceed to the Student Services Center located in the Silver Jubilee Tower (SJT), "
                    "Ground Floor, Room G12. Office hours are Monday through Friday, 9:00 AM to 4:30 PM.\n"
                    "Requirements:\n"
                    "1. Original Government Photo ID (Passport, Driver's License, or National ID)\n"
                    "2. Campus Police Incident Log receipt or Lost Property Declaration\n"
                    "3. Proof of active term enrollment and fee clearance receipt\n"
                    "4. Passport-size photograph (can also be captured at the counter)\n"
                    "A mandatory replacement card fee of $15 is charged upon processing. Replacement cards are issued within 15 minutes."
                ),
                "section": "Section 4.2: Identification Credentials",
                "page": 34,
                "doc_id": doc_handbook.id,
                "status": "VERIFIED",
            },
            {
                "content": (
                    "Nexora Central Library Operating Hours and Guidelines (Handbook Section 3.1):\n"
                    "The Central Library occupies Levels 1 through 4 of the Library & Information Commons. "
                    "During active academic terms, the library operates 24 hours a day for registered students. "
                    "Silent study carrels are located on Level 3 and Level 4. Group discussion pods are situated on Level 2. "
                    "Wi-Fi networks 'Nexora-Secure' and 'eduroam' are available campus-wide."
                ),
                "section": "Section 3.1: Academic Facilities & Libraries",
                "page": 18,
                "doc_id": doc_handbook.id,
                "status": "VERIFIED",
            },
            {
                "content": (
                    "Overnight Laboratory Access & Safety Escort Protocol:\n"
                    "The Advanced Quantum Information & Computing Lab is situated on Floor 3 of the Silver Jubilee Tower (Room SJT-312). "
                    "The faculty head is Dr. Elena Rostova. Regular lab hours are 8:00 AM to 8:00 PM.\n"
                    "Students requiring post-11:00 PM overnight access must secure prior written authorization from the Department Head "
                    "and must arrange a campus security safety escort when entering or departing after midnight."
                ),
                "section": "Section 2.1: Quantum Computing Lab Protocol",
                "page": 5,
                "doc_id": doc_lab.id,
                "status": "VERIFIED",
            },
            {
                "content": (
                    "Hostel Night-Out Permission Protocol (Handbook Section 6.5):\n"
                    "Residential students planning overnight leave must submit an electronic leave pass on the Nexora Portal. "
                    "Parental or guardian verification via one-time password (OTP) is mandatory prior to 8:30 PM on the date of departure. "
                    "Emergency curfew contact number is +1 (555) 019-3321."
                ),
                "section": "Section 6.5: Residential Living",
                "page": 52,
                "doc_id": doc_handbook.id,
                "status": "VERIFIED",
            },
            {
                "content": (
                    "Official Transcripts and Bonafide Certificates:\n"
                    "Official student transcripts, grade cards, and bonafide enrollment certificates are issued by the "
                    "Academic Registry located in the Main Administrative Center, Room MB-104. Operating hours are 9:30 AM to 4:00 PM on weekdays. "
                    "Digital e-transcripts can be requested online with a 48-hour fulfillment window."
                ),
                "section": "Section 5.1: Academic Records",
                "page": 40,
                "doc_id": doc_handbook.id,
                "status": "VERIFIED",
            },
        ]

        for sc in sample_chunks:
            chunk_emb = embedding_provider.embed_text(sc["content"])
            chunk_rec = KnowledgeChunk(
                document_id=sc["doc_id"],
                community_id=community.id,
                content=sc["content"],
                page_number=sc["page"],
                section=sc["section"],
                verification_status=sc["status"],
            )
            chunk_rec.embedding = chunk_emb
            chunk_rec.metadata_dict = {
                "document_title": doc_handbook.title if sc["doc_id"] == doc_handbook.id else doc_lab.title,
                "section": sc["section"],
                "page": sc["page"],
            }
            db.add(chunk_rec)

        db.commit()

        # 11. Seed Navigation Graph Nodes and Edges
        seed_navigation(db, community)

        print("[SUCCESS] Nexora database successfully seeded with demo community, accounts, locations, services, procedures, knowledge chunks, and navigation graph.")
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to seed database: {e}")
        raise
    finally:
        db.close()


def seed_navigation(db, community):
    """Seed comprehensive demo indoor wayfinding graph connecting Library, SJT, and Academic Wings."""
    existing_node = db.query(NavigationNode).filter(NavigationNode.community_id == community.id).first()
    if existing_node:
        print("[INFO] Navigation graph already seeded.")
        return

    # Find locations for foreign keys
    loc_lib = db.query(Location).filter(Location.community_id == community.id, Location.name.ilike("%library%")).first()
    loc_sjt = db.query(Location).filter(Location.community_id == community.id, Location.name.ilike("%student services%")).first()
    loc_cat = db.query(Location).filter(Location.community_id == community.id, Location.name.ilike("%helpdesk%")).first()
    loc_health = db.query(Location).filter(Location.community_id == community.id, Location.name.ilike("%medical%")).first()

    # Create Nodes
    n_lib_entrance = NavigationNode(
        community_id=community.id,
        building_id="LIB",
        floor="Ground Floor",
        name="Central Library - Main Entrance",
        node_type=NodeType.ENTRANCE,
        x=100.0,
        y=150.0,
        is_accessible=True,
        location_id=loc_lib.id if loc_lib else None,
    )
    n_lib_concourse = NavigationNode(
        community_id=community.id,
        building_id="LIB",
        floor="Ground Floor",
        name="Library Main Concourse",
        node_type=NodeType.LANDMARK,
        x=200.0,
        y=150.0,
        is_accessible=True,
    )
    n_lib_stacks = NavigationNode(
        community_id=community.id,
        building_id="LIB",
        floor="Ground Floor",
        name="Library Book Stacks & Archives",
        node_type=NodeType.ROOM,
        x=250.0,
        y=100.0,
        is_accessible=True,
    )
    n_skybridge_west = NavigationNode(
        community_id=community.id,
        building_id="LIB",
        floor="Ground Floor",
        name="Skybridge West Concourse",
        node_type=NodeType.CORRIDOR,
        x=320.0,
        y=180.0,
        is_accessible=True,
    )
    n_skybridge_east = NavigationNode(
        community_id=community.id,
        building_id="SJT",
        floor="Ground Floor",
        name="Skybridge East Connector",
        node_type=NodeType.CORRIDOR,
        x=420.0,
        y=220.0,
        is_accessible=True,
    )
    n_sjt_stair_g = NavigationNode(
        community_id=community.id,
        building_id="SJT",
        floor="Ground Floor",
        name="SJT Ground Floor Staircase",
        node_type=NodeType.STAIR,
        x=480.0,
        y=220.0,
        is_accessible=False,
    )
    n_sjt_elevator_g = NavigationNode(
        community_id=community.id,
        building_id="SJT",
        floor="Ground Floor",
        name="SJT Ground Floor Elevator Bank",
        node_type=NodeType.ELEVATOR,
        x=520.0,
        y=220.0,
        is_accessible=True,
    )
    n_sjt_lobby = NavigationNode(
        community_id=community.id,
        building_id="SJT",
        floor="Ground Floor",
        name="SJT Ground Floor Main Lobby",
        node_type=NodeType.ENTRANCE,
        x=500.0,
        y=280.0,
        is_accessible=True,
    )
    n_sjt_corridor_g = NavigationNode(
        community_id=community.id,
        building_id="SJT",
        floor="Ground Floor",
        name="SJT Ground Floor Wing Corridor",
        node_type=NodeType.CORRIDOR,
        x=580.0,
        y=310.0,
        is_accessible=True,
    )
    n_sjt_g12 = NavigationNode(
        community_id=community.id,
        building_id="SJT",
        floor="Ground Floor",
        name="Student Services Center (Room G12)",
        node_type=NodeType.ROOM,
        x=680.0,
        y=310.0,
        is_accessible=True,
        location_id=loc_sjt.id if loc_sjt else None,
    )
    n_sjt_exit_east = NavigationNode(
        community_id=community.id,
        building_id="SJT",
        floor="Ground Floor",
        name="SJT East Emergency Exit",
        node_type=NodeType.EXIT,
        x=800.0,
        y=310.0,
        is_accessible=True,
    )

    # Multi-floor Nodes (Level 1)
    n_sjt_stair_1 = NavigationNode(
        community_id=community.id,
        building_id="SJT",
        floor="Level 1",
        name="SJT Level 1 Staircase",
        node_type=NodeType.STAIR,
        x=480.0,
        y=220.0,
        is_accessible=False,
    )
    n_sjt_elevator_1 = NavigationNode(
        community_id=community.id,
        building_id="SJT",
        floor="Level 1",
        name="SJT Level 1 Elevator Bank",
        node_type=NodeType.ELEVATOR,
        x=520.0,
        y=220.0,
        is_accessible=True,
    )
    n_sjt_corridor_1 = NavigationNode(
        community_id=community.id,
        building_id="SJT",
        floor="Level 1",
        name="SJT Level 1 Academic Gallery",
        node_type=NodeType.CORRIDOR,
        x=580.0,
        y=250.0,
        is_accessible=True,
    )
    n_it_desk = NavigationNode(
        community_id=community.id,
        building_id="SJT",
        floor="Level 1",
        name="Campus IT Help Desk (Room 204)",
        node_type=NodeType.ROOM,
        x=680.0,
        y=250.0,
        is_accessible=True,
        location_id=loc_cat.id if loc_cat else None,
    )
    n_medical = NavigationNode(
        community_id=community.id,
        building_id="HWC",
        floor="Ground Floor",
        name="Campus Health & Urgent Clinic",
        node_type=NodeType.ROOM,
        x=850.0,
        y=150.0,
        is_accessible=True,
        location_id=loc_health.id if loc_health else None,
    )

    all_nodes = [
        n_lib_entrance, n_lib_concourse, n_lib_stacks, n_skybridge_west, n_skybridge_east,
        n_sjt_stair_g, n_sjt_elevator_g, n_sjt_lobby, n_sjt_corridor_g, n_sjt_g12, n_sjt_exit_east,
        n_sjt_stair_1, n_sjt_elevator_1, n_sjt_corridor_1, n_it_desk, n_medical
    ]
    db.add_all(all_nodes)
    db.commit()
    for n in all_nodes:
        db.refresh(n)

    # Create Walkable Edges
    edges = [
        # Ground Floor Library
        NavigationEdge(community_id=community.id, source_node_id=n_lib_entrance.id, destination_node_id=n_lib_concourse.id, distance=18.0, accessible=True),
        NavigationEdge(community_id=community.id, source_node_id=n_lib_concourse.id, destination_node_id=n_lib_stacks.id, distance=25.0, accessible=True),
        NavigationEdge(community_id=community.id, source_node_id=n_lib_concourse.id, destination_node_id=n_skybridge_west.id, distance=40.0, accessible=True),

        # Skybridge Connector
        NavigationEdge(community_id=community.id, source_node_id=n_skybridge_west.id, destination_node_id=n_skybridge_east.id, distance=55.0, accessible=True),

        # Skybridge to SJT Connectors (Stairs vs Elevator)
        NavigationEdge(community_id=community.id, source_node_id=n_skybridge_east.id, destination_node_id=n_sjt_stair_g.id, distance=20.0, accessible=True),
        NavigationEdge(community_id=community.id, source_node_id=n_skybridge_east.id, destination_node_id=n_sjt_elevator_g.id, distance=25.0, accessible=True),

        # Stairs / Elevator to SJT Lobby
        NavigationEdge(community_id=community.id, source_node_id=n_sjt_stair_g.id, destination_node_id=n_sjt_lobby.id, distance=15.0, accessible=False, stairs_required=True),
        NavigationEdge(community_id=community.id, source_node_id=n_sjt_elevator_g.id, destination_node_id=n_sjt_lobby.id, distance=15.0, accessible=True, elevator_available=True),

        # SJT Lobby to Wing Corridor and Student Services
        NavigationEdge(community_id=community.id, source_node_id=n_sjt_lobby.id, destination_node_id=n_sjt_corridor_g.id, distance=30.0, accessible=True),
        NavigationEdge(community_id=community.id, source_node_id=n_sjt_corridor_g.id, destination_node_id=n_sjt_g12.id, distance=35.0, accessible=True),
        NavigationEdge(community_id=community.id, source_node_id=n_sjt_corridor_g.id, destination_node_id=n_sjt_exit_east.id, distance=45.0, accessible=True),
        NavigationEdge(community_id=community.id, source_node_id=n_sjt_lobby.id, destination_node_id=n_medical.id, distance=90.0, accessible=True),

        # Multi-floor Transitions to Level 1
        NavigationEdge(community_id=community.id, source_node_id=n_sjt_stair_g.id, destination_node_id=n_sjt_stair_1.id, distance=20.0, accessible=False, stairs_required=True),
        NavigationEdge(community_id=community.id, source_node_id=n_sjt_elevator_g.id, destination_node_id=n_sjt_elevator_1.id, distance=15.0, accessible=True, elevator_available=True),

        # Level 1 Connections
        NavigationEdge(community_id=community.id, source_node_id=n_sjt_stair_1.id, destination_node_id=n_sjt_corridor_1.id, distance=25.0, accessible=False),
        NavigationEdge(community_id=community.id, source_node_id=n_sjt_elevator_1.id, destination_node_id=n_sjt_corridor_1.id, distance=20.0, accessible=True),
        NavigationEdge(community_id=community.id, source_node_id=n_sjt_corridor_1.id, destination_node_id=n_it_desk.id, distance=30.0, accessible=True),
    ]
    db.add_all(edges)
    db.commit()
    print(f"[SUCCESS] Navigation graph seeded with {len(all_nodes)} nodes and {len(edges)} walkable edges.")


if __name__ == "__main__":
    seed_database()
