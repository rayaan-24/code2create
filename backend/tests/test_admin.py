def test_document_verification_workflow(client, token_admin_a):
    headers = {"Authorization": f"Bearer {token_admin_a}"}

    # 1. Upload document metadata
    doc_payload = {
        "title": "Faculty Leave Policy 2026",
        "description": "Guidelines for sabbatical and medical leave.",
        "file_name": "leave_policy_2026.pdf",
        "file_type": "application/pdf",
    }
    doc_res = client.post("/api/v1/admin/documents", json=doc_payload, headers=headers)
    assert doc_res.status_code == 200
    doc_id = doc_res.json()["data"]["id"]
    assert doc_res.json()["data"]["verification_status"] == "PENDING"

    # 2. Verify document as Admin
    verify_payload = {"status": "VERIFIED"}
    verify_res = client.post(
        f"/api/v1/admin/documents/{doc_id}/verify",
        json=verify_payload,
        headers=headers,
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["data"]["verification_status"] == "VERIFIED"
    assert verify_res.json()["data"]["verified_at"] is not None

    # 3. Check audit log generated
    audit_res = client.get("/api/v1/admin/audit-logs", headers=headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()["data"]
    assert any(
        log["entity_type"] == "document" and log["action"] == "VERIFY" for log in logs
    )


def test_pagination(client, token_user_a, token_admin_a):
    headers_admin = {"Authorization": f"Bearer {token_admin_a}"}
    headers_user = {"Authorization": f"Bearer {token_user_a}"}

    # Create 5 sample locations
    for i in range(5):
        client.post(
            "/api/v1/admin/locations",
            json={"name": f"Test Room {i+1}", "location_type": "room"},
            headers=headers_admin,
        )

    # Fetch page 1 with page_size=2
    res = client.get("/api/v1/locations?page=1&page_size=2", headers=headers_user)
    assert res.status_code == 200
    data = res.json()
    assert len(data["data"]) == 2
    assert data["meta"]["page"] == 1
    assert data["meta"]["page_size"] == 2
    assert data["meta"]["total_items"] >= 5
