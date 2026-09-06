def test_register_success(client):
    payload = {
        "name": "Jordan Doe",
        "email": "jordan.doe@comm-a.edu",
        "password": "Password@123",
        "community_name": "University A",
        "role": "USER",
        "department": "Engineering",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 200
    data = response.json()["data"]
    assert "user" in data
    assert data["user"]["email"] == "jordan.doe@comm-a.edu"
    assert "tokens" in data
    assert "access_token" in data["tokens"]
    assert "password_hash" not in data["user"]


def test_register_duplicate_email(client):
    payload = {
        "name": "Duplicate User",
        "email": "student@comm-a.edu",
        "password": "Password@123",
        "community_name": "University A",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "DUPLICATE_RESOURCE"


def test_register_admin_disallowed(client):
    payload = {
        "name": "Sneaky User",
        "email": "sneaky@comm-a.edu",
        "password": "Password@123",
        "community_name": "University A",
        "role": "ADMIN",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "ACCESS_DENIED"


def test_login_success(client):
    payload = {
        "email": "student@comm-a.edu",
        "password": "Student@123",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()["data"]
    assert "tokens" in data
    assert data["user"]["email"] == "student@comm-a.edu"


def test_login_invalid_password(client):
    payload = {
        "email": "student@comm-a.edu",
        "password": "WrongPassword999",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_protected_me_endpoint(client, token_user_a):
    headers = {"Authorization": f"Bearer {token_user_a}"}
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["data"]["email"] == "student@comm-a.edu"


def test_unauthorized_access(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
