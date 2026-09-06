import math
import heapq
from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.models.navigation import NavigationNode, NavigationEdge, NodeType


class RouteNodeInfo(BaseModel):
    id: str
    name: str
    building_id: str
    floor: str
    node_type: str
    x: float
    y: float
    is_accessible: bool


class RouteStep(BaseModel):
    instruction: str
    distance: str
    distance_meters: float
    landmark: Optional[str] = None
    floor: str
    node_type: str


class RouteResult(BaseModel):
    success: bool = True
    message: str = "Route found successfully."
    route_id: str = ""
    start_node_id: str = ""
    destination_node_id: str = ""
    start_name: str = ""
    destination_name: str = ""
    total_distance_meters: float = 0.0
    estimated_minutes: int = 0
    is_accessible: bool = False
    nodes: List[RouteNodeInfo] = []
    steps: List[RouteStep] = []
    floor_changes: List[Any] = []

    @property
    def total_distance(self) -> float:
        return self.total_distance_meters

    @property
    def node_ids(self) -> List[str]:
        return [n.id for n in self.nodes]

    @property
    def instructions(self) -> List[str]:
        return [s.instruction for s in self.steps]


class AStarRouter:
    """
    A* Graph Pathfinding Engine for indoor campus navigation.
    Supports accessible routing, multi-floor wayfinding, and natural instruction generation.
    """

    def __init__(self, db: Optional[Session] = None, community_id: Optional[str] = None):
        self.db = db
        self.community_id = community_id

    @staticmethod
    def _euclidean_distance(n1: NavigationNode, n2: NavigationNode) -> float:
        """Heuristic calculation in normalized 0-1000 coordinate space."""
        dx = n1.x - n2.x
        dy = n1.y - n2.y
        base_dist = math.sqrt(dx * dx + dy * dy) * 0.5  # Scale factor to rough meters
        if n1.floor != n2.floor:
            # Floor change penalty heuristic
            base_dist += 25.0
        return base_dist

    def find_path(
        self,
        start_node_id: str,
        destination_node_id: str,
        accessible: bool = False,
    ) -> RouteResult:
        """Instance method for AStarRouter(db, community_id).find_path(start, dest)."""
        if not self.db or not self.community_id:
            raise ValueError("db and community_id required on AStarRouter instance")
        return self._find_path_impl(self.db, self.community_id, start_node_id, destination_node_id, accessible)

    @classmethod
    def calculate_route(
        cls,
        db: Session,
        community_id: str,
        start_node_id: str,
        destination_node_id: str,
        accessible: bool = False,
    ) -> RouteResult:
        """Classmethod for AStarRouter.calculate_route(db, community_id, start, dest)."""
        return cls._find_path_impl(db, community_id, start_node_id, destination_node_id, accessible)

    @classmethod
    def _find_path_impl(
        cls,
        db: Session,
        community_id: str,
        start_node_id: str,
        destination_node_id: str,
        accessible: bool = False,
    ) -> Optional[RouteResult]:
        """
        Calculates optimal path from start_node_id to destination_node_id using A*.
        If accessible is True, avoids edges requiring stairs.
        """
        # 1. Fetch nodes and verify community ownership
        nodes_query = db.query(NavigationNode).filter(NavigationNode.community_id == community_id).all()
        node_map: Dict[str, NavigationNode] = {n.id: n for n in nodes_query}

        if start_node_id not in node_map:
            return RouteResult(success=False, message=f"Starting node '{start_node_id}' not found.")
        if destination_node_id not in node_map:
            return RouteResult(success=False, message=f"Destination node '{destination_node_id}' not found.")

        start_node = node_map[start_node_id]
        dest_node = node_map[destination_node_id]

        if start_node_id == destination_node_id:
            # Same source and destination
            node_info = RouteNodeInfo(
                id=start_node.id,
                name=start_node.name,
                building_id=start_node.building_id,
                floor=start_node.floor,
                node_type=start_node.node_type.value,
                x=start_node.x,
                y=start_node.y,
                is_accessible=start_node.is_accessible,
            )
            step = RouteStep(
                instruction=f"You are already at {start_node.name}.",
                distance="0m",
                distance_meters=0.0,
                landmark=start_node.name,
                floor=start_node.floor,
                node_type=start_node.node_type.value,
            )
            return RouteResult(
                route_id=f"route_{start_node_id[:8]}_{destination_node_id[:8]}",
                start_node_id=start_node_id,
                destination_node_id=destination_node_id,
                start_name=start_node.name,
                destination_name=dest_node.name,
                total_distance_meters=0.0,
                estimated_minutes=1,
                is_accessible=True,
                nodes=[node_info],
                steps=[step],
                floor_changes=[],
            )

        # 2. Build adjacency list from navigation_edges
        edges_query = db.query(NavigationEdge).filter(NavigationEdge.community_id == community_id).all()
        adj: Dict[str, List[Tuple[str, float, NavigationEdge]]] = {nid: [] for nid in node_map}

        for edge in edges_query:
            u, v = edge.source_node_id, edge.destination_node_id
            if u not in node_map or v not in node_map:
                continue

            # Check accessibility constraint
            if accessible and (edge.stairs_required or not edge.accessible):
                continue

            adj[u].append((v, edge.distance, edge))
            if edge.bidirectional:
                adj[v].append((u, edge.distance, edge))

        # 3. A* Search
        open_set: List[Tuple[float, float, str]] = []  # (f_score, g_score, node_id)
        heapq.heappush(open_set, (0.0, 0.0, start_node_id))

        came_from: Dict[str, str] = {}
        edge_used: Dict[str, NavigationEdge] = {}
        g_score: Dict[str, float] = {nid: float("inf") for nid in node_map}
        g_score[start_node_id] = 0.0

        visited = set()

        while open_set:
            f, current_g, current_id = heapq.heappop(open_set)

            if current_id in visited:
                continue
            visited.add(current_id)

            if current_id == destination_node_id:
                # Reconstruct path
                path_node_ids: List[str] = []
                curr = destination_node_id
                while curr in came_from:
                    path_node_ids.append(curr)
                    curr = came_from[curr]
                path_node_ids.append(start_node_id)
                path_node_ids.reverse()

                # Generate structured path info
                return cls._build_route_result(
                    node_map=node_map,
                    path_ids=path_node_ids,
                    edge_used=edge_used,
                    total_distance=g_score[destination_node_id],
                    accessible=accessible,
                )

            current_node = node_map[current_id]

            for neighbor_id, dist, edge in adj[current_id]:
                if neighbor_id in visited:
                    continue

                neighbor_node = node_map[neighbor_id]
                tentative_g = current_g + dist

                if tentative_g < g_score[neighbor_id]:
                    came_from[neighbor_id] = current_id
                    edge_used[neighbor_id] = edge
                    g_score[neighbor_id] = tentative_g
                    h = cls._euclidean_distance(neighbor_node, dest_node)
                    f_score = tentative_g + h
                    heapq.heappush(open_set, (f_score, tentative_g, neighbor_id))

        # No path found
        return RouteResult(success=False, message="No valid route could be found between specified locations.")

    @classmethod
    def _build_route_result(
        cls,
        node_map: Dict[str, NavigationNode],
        path_ids: List[str],
        edge_used: Dict[str, NavigationEdge],
        total_distance: float,
        accessible: bool,
    ) -> RouteResult:
        from app.navigation.instructions import InstructionGenerator

        nodes: List[RouteNodeInfo] = []
        floor_changes: List[str] = []
        prev_floor = None

        for nid in path_ids:
            n = node_map[nid]
            nodes.append(
                RouteNodeInfo(
                    id=n.id,
                    name=n.name,
                    building_id=n.building_id,
                    floor=n.floor,
                    node_type=n.node_type.value,
                    x=n.x,
                    y=n.y,
                    is_accessible=n.is_accessible,
                )
            )
            if prev_floor and n.floor != prev_floor:
                floor_changes.append(f"{prev_floor} -> {n.floor}")
            prev_floor = n.floor

        # Estimated walking time (average 65 meters per minute + elevator/stair overhead)
        minutes = max(1, math.ceil(total_distance / 65.0) + len(floor_changes) * 1)

        # Generate human instructions
        steps = InstructionGenerator.generate_instructions(nodes, path_ids, edge_used)

        start_n = node_map[path_ids[0]]
        dest_n = node_map[path_ids[-1]]

        return RouteResult(
            route_id=f"route_{start_n.id[:8]}_{dest_n.id[:8]}",
            start_node_id=start_n.id,
            destination_node_id=dest_n.id,
            start_name=start_n.name,
            destination_name=dest_n.name,
            total_distance_meters=round(total_distance, 1),
            estimated_minutes=minutes,
            is_accessible=accessible,
            nodes=nodes,
            steps=steps,
            floor_changes=floor_changes,
        )


AStarNavigator = AStarRouter

