import os
import sys
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.base import Base
from app.database.session import get_db
from app.main import app
from app.models.community import Community, CommunityType
from app.models.user import User, UserRole
from app.core.security import hash_password, create_access_token

# In-memory SQLite for high-speed isolated tests
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        # Seed test communities
        comm_a = Community(
            id="comm_a_id",
            name="University A",
            type=CommunityType.UNIVERSITY,
        )
        comm_b = Community(
            id="comm_b_id",
            name="University B",
            type=CommunityType.UNIVERSITY,
        )
        session.add_all([comm_a, comm_b])
        session.commit()

        # Seed test users
        admin_a = User(
            id="admin_a_id",
            community_id="comm_a_id",
            name="Admin Alpha",
            email="admin@comm-a.edu",
            password_hash=hash_password("Admin@123"),
            role=UserRole.ADMIN,
            is_active=True,
        )
        user_a = User(
            id="user_a_id",
            community_id="comm_a_id",
            name="User Alpha",
            email="student@comm-a.edu",
            password_hash=hash_password("Student@123"),
            role=UserRole.USER,
            is_active=True,
        )
        user_b = User(
            id="user_b_id",
            community_id="comm_b_id",
            name="User Beta",
            email="student@comm-b.edu",
            password_hash=hash_password("Student@123"),
            role=UserRole.USER,
            is_active=True,
        )
        session.add_all([admin_a, user_a, user_b])
        session.commit()

        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def token_user_a():
    return create_access_token(
        subject="user_a_id",
        community_id="comm_a_id",
        role="USER",
    )


@pytest.fixture
def token_admin_a():
    return create_access_token(
        subject="admin_a_id",
        community_id="comm_a_id",
        role="ADMIN",
    )


@pytest.fixture
def token_user_b():
    return create_access_token(
        subject="user_b_id",
        community_id="comm_b_id",
        role="USER",
    )


@pytest.fixture
def db_session(db):
    return db


@pytest.fixture
def community_a(db):
    from app.models.procedure import Procedure, ProcedureStep, ProcedureRequirement, VerificationStatus
    from app.models.location import Location
    from app.models.chunk import KnowledgeChunk
    from app.ai.retrieval.embeddings import embedding_provider

    comm = db.query(Community).filter(Community.id == "comm_a_id").first()

    # Seed test procedure if not exists
    existing_p = db.query(Procedure).filter(Procedure.community_id == comm.id).first()
    if not existing_p:
        proc = Procedure(
            community_id=comm.id,
            title="ID Card Replacement",
            description="Official guidelines for lost student or staff ID badge replacement.",
            category="Student Services",
            fee="$15",
            estimated_time="15 minutes",
            verification_status=VerificationStatus.VERIFIED,
            is_active=True,
        )
        db.add(proc)
        db.commit()
        db.refresh(proc)

        step1 = ProcedureStep(procedure_id=proc.id, step_number=1, instruction="File lost property report.")
        step2 = ProcedureStep(procedure_id=proc.id, step_number=2, instruction="Visit Student Services (SJT-G12).")
        req1 = ProcedureRequirement(procedure_id=proc.id, name="Government Photo ID")
        db.add_all([step1, step2, req1])

        # Seed locations
        loc = Location(
            community_id=comm.id,
            name="Student Services Center",
            room_number="G12",
            floor="Ground Floor",
            building_id="Silver Jubilee Tower (SJT)",
            location_type="Administration",
            description="Primary helpdesk for student ID cards and verification.",
        )
        loc_lib = Location(
            community_id=comm.id,
            name="Central Library",
            room_number="L101",
            floor="Ground Floor",
            building_id="Learning Resource Centre",
            location_type="Facility",
            description="Central university library open 24/7.",
        )
        db.add_all([loc, loc_lib])

        # Seed chunk
        content = (
            "Student ID Card Replacement Procedure:\n"
            "Visit the Student Services Center located in the Silver Jubilee Tower (SJT), Ground Floor, Room G12. "
            "Office hours: 9:00 AM - 4:30 PM. Requirements: Government Photo ID and fee clearance. Fee: $15."
        )
        chunk = KnowledgeChunk(
            community_id=comm.id,
            content=content,
            section="Section 4.2",
            page_number=34,
            verification_status="VERIFIED",
        )
        chunk.embedding = embedding_provider.embed_text(content)
        chunk.metadata_dict = {"document_title": "Student Handbook"}
        db.add(chunk)

        # Seed library chunk
        lib_content = "Nexora Central Library is open 24/7 during exam term across Levels 1 to 4."
        lib_chunk = KnowledgeChunk(
            community_id=comm.id,
            content=lib_content,
            section="Section 3.1",
            page_number=18,
            verification_status="VERIFIED",
        )
        lib_chunk.embedding = embedding_provider.embed_text(lib_content)
        lib_chunk.metadata_dict = {"document_title": "Student Handbook"}
        db.add(lib_chunk)

        db.commit()

    return comm


@pytest.fixture
def user_a(db, community_a):
    return db.query(User).filter(User.id == "user_a_id").first()
