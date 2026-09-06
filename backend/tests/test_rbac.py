def test_normal_user_blocked_from_admin_dashboard(client, token_user_a):
    headers = {"Authorization": f"Bearer {token_user_a}"}
    response = client.get("/api/v1/admin/dashboard", headers=headers)
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "ACCESS_DENIED"


def test_normal_user_blocked_from_admin_create_location(client, token_user_a):
    headers = {"Authorization": f"Bearer {token_user_a}"}
    payload = {"name": "Unauthorized Room", "location_type": "room"}
    response = client.post("/api/v1/admin/locations", json=payload, headers=headers)
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "ACCESS_DENIED"


def test_admin_access_allowed(client, token_admin_a):
    headers = {"Authorization": f"Bearer {token_admin_a}"}
    response = client.get("/api/v1/admin/dashboard", headers=headers)
    assert response.status_code == 200
    data = response.json()["data"]
    assert "total_users" in data
    assert "total_locations" in data
