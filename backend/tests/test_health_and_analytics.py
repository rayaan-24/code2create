import pytest
from fastapi.testclient import TestClient


def test_health_endpoint(client: TestClient):
    """Test GET /health returns system status and component breakdown."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "components" in data
    assert "database" in data["components"]
    assert data["components"]["database"] == "healthy"
    assert "ai" in data["components"]
    assert "search" in data["components"]
    assert "voice" in data["components"]


def test_sub_health_endpoints(client: TestClient):
    """Test individual modular health check endpoints."""
    db_res = client.get("/health/database")
    assert db_res.status_code == 200
    assert db_res.json()["status"] == "healthy"
    assert db_res.json()["service"] == "database"

    db_alias_res = client.get("/health/db")
    assert db_alias_res.status_code == 200
    assert db_alias_res.json()["status"] == "healthy"

    ai_res = client.get("/health/ai")
    assert ai_res.status_code == 200
    assert ai_res.json()["service"] == "ai"
    assert ai_res.json()["status"] in ["healthy", "degraded"]

    search_res = client.get("/health/search")
    assert search_res.status_code == 200
    assert search_res.json()["service"] == "search"

    voice_res = client.get("/health/voice")
    assert voice_res.status_code == 200
    assert voice_res.json()["service"] == "voice"


def test_admin_confusion_map_analytics(client: TestClient, token_admin_a: str):
    """Test GET /api/v1/admin/analytics/confusion-map requires admin role and returns actionable gaps."""
    headers = {"Authorization": f"Bearer {token_admin_a}"}
    response = client.get("/api/v1/admin/analytics/confusion-map", headers=headers)
    assert response.status_code == 200
    data = response.json()["data"]

    assert "most_asked" in data
    assert len(data["most_asked"]) > 0
    assert "confusing_procedures" in data
    assert len(data["confusing_procedures"]) > 0
    assert "frequently_requested_locations" in data
    assert "unanswered_questions" in data
    assert "knowledge_gaps" in data
    assert len(data["knowledge_gaps"]) > 0

    first_gap = data["knowledge_gaps"][0]
    assert "title" in first_gap
    assert "impact" in first_gap
    assert "suggested_action" in first_gap


def test_admin_confusion_map_unauthorized_user(client: TestClient, token_user_a: str):
    """Standard users without ADMIN role cannot access confusion map analytics."""
    headers = {"Authorization": f"Bearer {token_user_a}"}
    response = client.get("/api/v1/admin/analytics/confusion-map", headers=headers)
    assert response.status_code == 403
