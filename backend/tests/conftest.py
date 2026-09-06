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
