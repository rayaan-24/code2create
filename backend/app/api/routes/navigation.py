from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.dependencies.auth import get_active_or_demo_user
from app.models.user import User
from app.models.navigation import NavigationNode
from app.navigation.astar import AStarRouter, RouteResult
from app.navigation.resolver import LocationResolver

router = APIRouter(prefix="/navigation", tags=["Navigation"])


class RouteRequest(BaseModel):
    start_location_id: Optional[str] = Field(None, description="Starting node or location UUID")
    destination_location_id: Optional[str] = Field(None, description="Destination node or location UUID")
    start_query: Optional[str] = Field(None, description="Natural language start point e.g. 'Library'")
    destination_query: Optional[str] = Field(None, description="Natural language destination e.g. 'Student Services'")
    start: Optional[str] = Field(None, description="Alias for start_query")
    destination: Optional[str] = Field(None, description="Alias for destination_query")
    accessible: bool = Field(False, description="Prefer accessible elevators/ramps and avoid stairs")


class ResolveRequest(BaseModel):
    query: str = Field(..., description="Location name, room code, or landmark to resolve")


@router.post("/route", response_model=Dict[str, Any])
def get_route(
    req: RouteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_or_demo_user),
):
    """
    Calculates the shortest or accessible walking route between two points
    in the user's community using the A* pathfinding algorithm.
    """
    comm_id = current_user.community_id

    # 1. Resolve Start Node
    start_node = None
    if req.start_location_id:
        start_node = db.query(NavigationNode).filter(
            NavigationNode.community_id == comm_id,
            (NavigationNode.id == req.start_location_id) | (NavigationNode.location_id == req.start_location_id),
        ).first()

    start_q = req.start_query or req.start
    if not start_node and start_q:
        start_node, _, _ = LocationResolver.resolve_node(db, comm_id, start_q)

    if not start_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Could not resolve starting location '{start_q or req.start_location_id}' in this community.",
        )

    # 2. Resolve Destination Node
    dest_node = None
    if req.destination_location_id:
        dest_node = db.query(NavigationNode).filter(
            NavigationNode.community_id == comm_id,
            (NavigationNode.id == req.destination_location_id) | (NavigationNode.location_id == req.destination_location_id),
        ).first()

    dest_q = req.destination_query or req.destination
    if not dest_node and dest_q:
        dest_node, _, is_ambiguous = LocationResolver.resolve_node(db, comm_id, dest_q)
        if is_ambiguous and not dest_node:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Multiple locations match '{dest_q}'. Please specify the building or room number.",
            )

    if not dest_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Could not resolve destination location '{req.destination_query or req.destination_location_id}' in this community.",
        )

    # 3. Calculate Route using A*
    route = AStarRouter.calculate_route(
        db=db,
        community_id=comm_id,
        start_node_id=start_node.id,
        destination_node_id=dest_node.id,
        accessible=req.accessible,
    )

    if not route:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"I couldn't find a valid {'accessible ' if req.accessible else ''}route between {start_node.name} and {dest_node.name}.",
        )

    route_dict = route.model_dump()
    route_dict["distance"] = route_dict["total_distance_meters"]
    route_dict["accessible"] = route_dict["is_accessible"]
    route_dict["instructions"] = [s["instruction"] for s in route_dict.get("steps", [])]

    return {
        "status": "success",
        "route": route_dict,
    }


@router.get("/locations")
def list_navigation_nodes(
    floor: Optional[str] = None,
    building_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_or_demo_user),
):
    """
    Returns navigable nodes and landmarks for the authenticated user's community.
    """
    q = db.query(NavigationNode).filter(NavigationNode.community_id == current_user.community_id)
    if floor:
        q = q.filter(NavigationNode.floor == floor)
    if building_id:
        q = q.filter(NavigationNode.building_id == building_id)

    nodes = q.all()
    return {
        "count": len(nodes),
        "nodes": [
            {
                "id": n.id,
                "name": n.name,
                "building_id": n.building_id,
                "floor": n.floor,
                "node_type": n.node_type.value,
                "x": n.x,
                "y": n.y,
                "is_accessible": n.is_accessible,
                "location_id": n.location_id,
            }
            for n in nodes
        ],
    }


@router.post("/resolve")
def resolve_location(
    req: ResolveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_or_demo_user),
):
    """
    Resolves natural language location string to concrete node coordinates and info.
    """
    node, confidence, is_ambiguous = LocationResolver.resolve_node(
        db=db,
        community_id=current_user.community_id,
        query=req.query,
    )

    if not node:
        return {
            "found": False,
            "query": req.query,
            "node": None,
            "confidence": 0.0,
            "is_ambiguous": False,
        }

    return {
        "found": True,
        "query": req.query,
        "confidence": confidence,
        "is_ambiguous": is_ambiguous,
        "node": {
            "id": node.id,
            "name": node.name,
            "building_id": node.building_id,
            "floor": node.floor,
            "node_type": node.node_type.value,
            "x": node.x,
            "y": node.y,
            "is_accessible": node.is_accessible,
            "location_id": node.location_id,
        },
    }
