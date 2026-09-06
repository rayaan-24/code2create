import pytest
from app.navigation.astar import AStarNavigator
from app.navigation.resolver import LocationResolver
from app.navigation.instructions import generate_turn_by_turn_instructions
from app.models.navigation import NavigationNode, NavigationEdge, NodeType


def test_astar_valid_route(db_session, community_a):
    """Test standard valid route between Library and Student Services."""
    navigator = AStarNavigator(db_session, community_a.id)
    result = navigator.find_path("test-lib", "test-services", accessible=False)

    assert result is not None
    assert result.success is True
    assert result.node_ids[0] == "test-lib"
    assert result.node_ids[-1] == "test-services"
    assert result.total_distance > 0
    assert result.estimated_minutes >= 1
    assert len(result.instructions) >= 2


def test_astar_accessible_route_avoids_stairs(db_session, community_a):
    """Test accessible route avoids stair nodes and uses elevators."""
    navigator = AStarNavigator(db_session, community_a.id)
    
    # Accessible route
    result_acc = navigator.find_path("test-lib", "test-services", accessible=True)
    assert result_acc is not None
    assert result_acc.success is True
    # Stair node should NOT be in the accessible path
    assert "test-stair-0" not in result_acc.node_ids
    assert "test-elev-0" in result_acc.node_ids

    # Standard route can use stairs (stair path is 30+25=55m, elevator is 32+25=57m, so standard takes stairs)
    result_std = navigator.find_path("test-lib", "test-services", accessible=False)
    assert result_std is not None
    assert "test-stair-0" in result_std.node_ids


def test_astar_same_source_and_destination(db_session, community_a):
    """Test routing when source equals destination."""
    navigator = AStarNavigator(db_session, community_a.id)
    result = navigator.find_path("test-lib", "test-lib")

    assert result is not None
    assert result.success is True
    assert result.total_distance == 0.0
    assert result.node_ids == ["test-lib"]
    assert "already at" in result.instructions[0].lower()


def test_astar_invalid_source_or_destination(db_session, community_a):
    """Test routing with non-existent node IDs."""
    navigator = AStarNavigator(db_session, community_a.id)
    
    res1 = navigator.find_path("non-existent-node", "test-services")
    assert res1.success is False
    assert "not found" in res1.message

    res2 = navigator.find_path("test-lib", "non-existent-node")
    assert res2.success is False
    assert "not found" in res2.message


def test_astar_no_route(db_session, community_a):
    """Test routing to an isolated disconnected node."""
    isolated = NavigationNode(
        id="test-island",
        community_id=community_a.id,
        building_id="Outer",
        floor=0,
        name="Island Pavilion",
        node_type=NodeType.ROOM,
        x=999.0,
        y=999.0,
    )
    db_session.add(isolated)
    db_session.commit()

    navigator = AStarNavigator(db_session, community_a.id)
    result = navigator.find_path("test-lib", "test-island")

    assert result.success is False
    assert "no valid route" in result.message.lower() or "no route" in result.message.lower()


def test_astar_multi_floor_route(db_session, community_a):
    """Test routing across floors (Floor 0 -> Floor 1)."""
    navigator = AStarNavigator(db_session, community_a.id)
    result = navigator.find_path("test-lib", "test-it-1", accessible=True)

    assert result.success is True
    assert len(result.floor_changes) > 0
    assert any("0" in str(fc) and "1" in str(fc) for fc in result.floor_changes)
    assert any("floor 1" in inst.lower() or "elevator" in inst.lower() for inst in result.instructions)


def test_location_resolver(db_session, community_a):
    """Test natural language location resolution for aliases and partial matches."""
    resolver = LocationResolver(db_session, community_a.id)

    # Exact match
    res1 = resolver.resolve("Student Services")
    assert res1.matched is True
    assert res1.node is not None
    assert "Student Services" in res1.node.name

    # Alias / lowercase
    res2 = resolver.resolve("library")
    assert res2.matched is True
    assert "Library" in res2.node.name

    # Room number
    res3 = resolver.resolve("Room G12")
    assert res3.matched is True
    assert res3.node.name == "Room G12"


def test_navigation_api_endpoints(client, token_user_a, community_a):
    """Test HTTP POST /api/v1/navigation/route and GET /locations endpoints."""
    headers = {"Authorization": f"Bearer {token_user_a}"}

    # 1. GET locations
    loc_resp = client.get("/api/v1/navigation/locations", headers=headers)
    assert loc_resp.status_code == 200
    data = loc_resp.json()
    nodes = data.get("nodes", data) if isinstance(data, dict) else data
    assert len(nodes) >= 4

    # 2. POST route with location names
    route_resp = client.post(
        "/api/v1/navigation/route",
        headers=headers,
        json={
            "start": "Library",
            "destination": "Student Services",
            "accessible": False,
        },
    )
    assert route_resp.status_code == 200
    data = route_resp.json()
    assert "route" in data
    assert data["route"]["distance"] > 0
    assert len(data["route"]["instructions"]) > 0

    # 3. POST route accessible
    route_acc = client.post(
        "/api/v1/navigation/route",
        headers=headers,
        json={
            "start": "Library",
            "destination": "Student Services",
            "accessible": True,
        },
    )
    assert route_acc.status_code == 200
    acc_data = route_acc.json()
    assert acc_data["route"]["accessible"] is True
