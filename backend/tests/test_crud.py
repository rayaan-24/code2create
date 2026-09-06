def test_location_crud_and_search(client, token_admin_a, token_user_a):
    headers_admin = {"Authorization": f"Bearer {token_admin_a}"}
    headers_user = {"Authorization": f"Bearer {token_user_a}"}

    # 1. Create Location
    create_payload = {
        "name": "Robotics Discovery Center",
        "room_number": "ROB-404",
        "floor": "Floor 4",
        "description": "Autonomous drones and quadruped robotics arena.",
        "x_coordinate": 120.5,
        "y_coordinate": 250.0,
    }
    create_res = client.post("/api/v1/admin/locations", json=create_payload, headers=headers_admin)
    assert create_res.status_code == 200
    loc_id = create_res.json()["data"]["id"]

    # 2. Search location as normal user
    search_res = client.get("/api/v1/locations?search=Robotics", headers=headers_user)
    assert search_res.status_code == 200
    data = search_res.json()["data"]
    assert len(data) == 1
    assert data[0]["name"] == "Robotics Discovery Center"

    # 3. Update Location
    update_res = client.put(
        f"/api/v1/admin/locations/{loc_id}",
        json={"room_number": "ROB-405"},
        headers=headers_admin,
    )
    assert update_res.status_code == 200
    assert update_res.json()["data"]["room_number"] == "ROB-405"


def test_procedure_crud_with_steps(client, token_admin_a, token_user_a):
    headers_admin = {"Authorization": f"Bearer {token_admin_a}"}
    headers_user = {"Authorization": f"Bearer {token_user_a}"}

    payload = {
        "title": "Gym Locker Rental Protocol",
        "description": "Semester-long sports pavilion locker allocation.",
        "category": "Facilities",
        "fee": "$10.00",
        "steps": [
            {"step_number": 1, "instruction": "Visit pavilion reception."},
            {"step_number": 2, "instruction": "Choose locker number and settle fee."},
        ],
        "requirements": [
            {"name": "Valid Student ID", "required": True},
        ],
    }
    create_res = client.post("/api/v1/admin/procedures", json=payload, headers=headers_admin)
    assert create_res.status_code == 200
    proc_data = create_res.json()["data"]
    assert proc_data["title"] == "Gym Locker Rental Protocol"
    assert len(proc_data["steps"]) == 2

    # User retrieves procedure
    get_res = client.get(f"/api/v1/procedures/{proc_data['id']}", headers=headers_user)
    assert get_res.status_code == 200
    assert get_res.json()["data"]["title"] == "Gym Locker Rental Protocol"


def test_announcement_crud(client, token_admin_a, token_user_a):
    headers_admin = {"Authorization": f"Bearer {token_admin_a}"}
    headers_user = {"Authorization": f"Bearer {token_user_a}"}

    payload = {
        "title": "Severe Weather Notice",
        "content": "All evening classes shifted to virtual due to thunderstorm advisory.",
        "category": "Emergency",
        "priority": "URGENT",
    }
    create_res = client.post("/api/v1/admin/announcements", json=payload, headers=headers_admin)
    assert create_res.status_code == 200
    ann_id = create_res.json()["data"]["id"]

    # User views active announcements
    list_res = client.get("/api/v1/announcements?priority=URGENT", headers=headers_user)
    assert list_res.status_code == 200
    assert any(a["id"] == ann_id for a in list_res.json()["data"])
