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

        # Seed navigation nodes and edges for comm_a_id
        from app.models.navigation import NavigationNode, NavigationEdge, NodeType
        n1 = NavigationNode(id="test-lib", community_id=comm.id, building_id="Library", floor=0, name="Library Main Entrance", node_type=NodeType.ENTRANCE, x=100.0, y=300.0)
        n2 = NavigationNode(id="test-corridor", community_id=comm.id, building_id="Library", floor=0, name="Corridor A", node_type=NodeType.CORRIDOR, x=250.0, y=300.0)
        n3 = NavigationNode(id="test-stair-0", community_id=comm.id, building_id="SJT", floor=0, name="SJT Stairs", node_type=NodeType.STAIR, x=400.0, y=200.0)
        n4 = NavigationNode(id="test-elev-0", community_id=comm.id, building_id="SJT", floor=0, name="SJT Elevator", node_type=NodeType.ELEVATOR, x=400.0, y=400.0)
        n5 = NavigationNode(id="test-sjt-g", community_id=comm.id, building_id="SJT", floor=0, name="SJT Ground Floor", node_type=NodeType.INTERSECTION, x=500.0, y=300.0)
        n6 = NavigationNode(id="test-services", community_id=comm.id, building_id="SJT", floor=0, name="Student Services", node_type=NodeType.ROOM, x=750.0, y=300.0, location_id=loc.id)
        n7 = NavigationNode(id="test-g12", community_id=comm.id, building_id="SJT", floor=0, name="Room G12", node_type=NodeType.ROOM, x=850.0, y=300.0)
        n8 = NavigationNode(id="test-stair-1", community_id=comm.id, building_id="SJT", floor=1, name="SJT Stairs Floor 1", node_type=NodeType.STAIR, x=400.0, y=200.0)
        n9 = NavigationNode(id="test-elev-1", community_id=comm.id, building_id="SJT", floor=1, name="SJT Elevator Floor 1", node_type=NodeType.ELEVATOR, x=400.0, y=400.0)
        n10 = NavigationNode(id="test-it-1", community_id=comm.id, building_id="SJT", floor=1, name="IT Help Desk", node_type=NodeType.ROOM, x=750.0, y=300.0)

        db.add_all([n1, n2, n3, n4, n5, n6, n7, n8, n9, n10])
        db.flush()

        e1 = NavigationEdge(community_id=comm.id, source_node_id=n1.id, destination_node_id=n2.id, distance=35.0, accessible=True, stairs_required=False, bidirectional=True)
        e2 = NavigationEdge(community_id=comm.id, source_node_id=n2.id, destination_node_id=n3.id, distance=30.0, accessible=False, stairs_required=True, bidirectional=True)
        e3 = NavigationEdge(community_id=comm.id, source_node_id=n2.id, destination_node_id=n4.id, distance=32.0, accessible=True, stairs_required=False, elevator_available=True, bidirectional=True)
        e4 = NavigationEdge(community_id=comm.id, source_node_id=n3.id, destination_node_id=n5.id, distance=25.0, accessible=False, stairs_required=True, bidirectional=True)
        e5 = NavigationEdge(community_id=comm.id, source_node_id=n4.id, destination_node_id=n5.id, distance=25.0, accessible=True, stairs_required=False, elevator_available=True, bidirectional=True)
        e6 = NavigationEdge(community_id=comm.id, source_node_id=n5.id, destination_node_id=n6.id, distance=60.0, accessible=True, stairs_required=False, bidirectional=True)
        e7 = NavigationEdge(community_id=comm.id, source_node_id=n6.id, destination_node_id=n7.id, distance=20.0, accessible=True, stairs_required=False, bidirectional=True)
        e8 = NavigationEdge(community_id=comm.id, source_node_id=n3.id, destination_node_id=n8.id, distance=20.0, accessible=False, stairs_required=True, bidirectional=True)
        e9 = NavigationEdge(community_id=comm.id, source_node_id=n4.id, destination_node_id=n9.id, distance=15.0, accessible=True, stairs_required=False, elevator_available=True, bidirectional=True)
        e10 = NavigationEdge(community_id=comm.id, source_node_id=n9.id, destination_node_id=n10.id, distance=50.0, accessible=True, stairs_required=False, bidirectional=True)

        db.add_all([e1, e2, e3, e4, e5, e6, e7, e8, e9, e10])
        db.commit()

    return comm


@pytest.fixture
def user_a(db, community_a):
    return db.query(User).filter(User.id == "user_a_id").first()
