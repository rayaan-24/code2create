import pytest
from app.ai.tools.registry import ToolRegistry


def test_get_procedure_tool(db_session, community_a):
    registry = ToolRegistry()
    res = registry.execute_tool(
        tool_name="get_procedure",
        arguments={"procedure_title": "ID Card"},
        db=db_session,
        community_id=community_a.id,
    )
    assert res.status == "success"
    assert res.data is not None
    assert "ID Card" in res.data["title"]
    assert "fee" in res.data
    assert "requiredDocuments" in res.data


def test_get_location_tool(db_session, community_a):
    registry = ToolRegistry()
    res = registry.execute_tool(
        tool_name="get_location",
        arguments={"query": "Student Services"},
        db=db_session,
        community_id=community_a.id,
    )
    assert res.status == "success"
    assert res.data is not None
    assert "Student Services" in res.data["name"]
    assert "floor" in res.data
    assert "room" in res.data


def test_calculate_route_tool(db_session, community_a):
    registry = ToolRegistry()
    res = registry.execute_tool(
        tool_name="calculate_route",
        arguments={"start_location": "Central Library", "destination": "Student Services"},
        db=db_session,
        community_id=community_a.id,
    )
    assert res.status == "success"
    assert res.data is not None
    assert res.data["etaMinutes"] > 0
    assert len(res.data["steps"]) > 0


def test_tool_depth_limit(db_session, community_a):
    registry = ToolRegistry(max_tool_calls=2)
    # 1st call
    r1 = registry.execute_tool("get_location", {"query": "Library"}, db_session, community_a.id)
    assert r1.status == "success"
    # 2nd call
    r2 = registry.execute_tool("get_location", {"query": "Library"}, db_session, community_a.id)
    assert r2.status == "success"
    # 3rd call should trigger depth limit
    r3 = registry.execute_tool("get_location", {"query": "Library"}, db_session, community_a.id)
    assert r3.status == "error"
    assert "exceeded" in r3.error.lower()
