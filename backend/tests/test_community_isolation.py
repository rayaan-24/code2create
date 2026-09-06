def test_cross_community_data_isolation(client, token_admin_a, token_user_b):
    # Admin of Community A creates a private location in Community A
    headers_a = {"Authorization": f"Bearer {token_admin_a}"}
    create_payload = {
        "name": "Secret Lab Community A",
        "room_number": "SEC-101",
        "floor": "Floor 1",
    }
    create_res = client.post("/api/v1/admin/locations", json=create_payload, headers=headers_a)
    assert create_res.status_code == 200
    location_id = create_res.json()["data"]["id"]

    # User from Community B queries locations list
    headers_b = {"Authorization": f"Bearer {token_user_b}"}
    list_res = client.get("/api/v1/locations", headers=headers_b)
    assert list_res.status_code == 200
    locations_b = list_res.json()["data"]
    # Community B must NOT see Community A's location in list
    assert not any(loc["id"] == location_id for loc in locations_b)

    # User from Community B directly attempts to fetch Community A's location ID
    direct_res = client.get(f"/api/v1/locations/{location_id}", headers=headers_b)
    # Must return 404 (or 403) due to community isolation filter
    assert direct_res.status_code == 404
