from typing import List, Dict
from app.models.navigation import NavigationEdge


class InstructionGenerator:
    """
    Translates raw graph nodes and traversed edges into natural,
    step-by-step pedestrian navigation instructions with landmarks.
    """

    @staticmethod
    def generate_instructions(nodes, path_ids: List[str], edge_used: Dict[str, NavigationEdge]):
        from app.navigation.astar import RouteStep

        if not nodes:
            return []

        if len(nodes) == 1:
            return [
                RouteStep(
                    instruction=f"You are currently at {nodes[0].name}.",
                    distance="0m",
                    distance_meters=0.0,
                    landmark=nodes[0].name,
                    floor=nodes[0].floor,
                    node_type=nodes[0].node_type,
                )
            ]

        steps: List[RouteStep] = []

        # Step 1: Initial departure
        first = nodes[0]
        second = nodes[1]
        first_edge = edge_used.get(second.id)
        first_dist = first_edge.distance if first_edge else 15.0

        steps.append(
            RouteStep(
                instruction=f"Depart from {first.name} on {first.floor}.",
                distance=f"{int(first_dist)}m",
                distance_meters=float(first_dist),
                landmark=first.name,
                floor=first.floor,
                node_type=first.node_type,
            )
        )

        for i in range(1, len(nodes) - 1):
            curr = nodes[i]
            nxt = nodes[i + 1]
            edge = edge_used.get(nxt.id)
            dist = edge.distance if edge else 20.0

            # Determine action based on node type and floor change
            if curr.floor != nxt.floor:
                if "ELEVATOR" in curr.node_type:
                    action = f"Take the elevator from {curr.floor} to {nxt.floor}."
                elif "STAIR" in curr.node_type:
                    action = f"Take the stairs from {curr.floor} to {nxt.floor}."
                else:
                    action = f"Transition from {curr.floor} to {nxt.floor}."
            elif curr.node_type == "INTERSECTION":
                action = f"At {curr.name}, turn towards {nxt.name}."
            elif curr.node_type == "LANDMARK":
                action = f"Pass by {curr.name} and continue along the corridor."
            elif curr.node_type == "ENTRANCE":
                action = f"Pass through the main entrance of {curr.building_id}."
            elif curr.node_type == "CORRIDOR":
                action = f"Walk straight along {curr.name} for approximately {int(dist)} meters."
            else:
                action = f"Proceed past {curr.name} towards {nxt.name}."

            steps.append(
                RouteStep(
                    instruction=action,
                    distance=f"{int(dist)}m",
                    distance_meters=float(dist),
                    landmark=curr.name if curr.node_type in ["LANDMARK", "ROOM", "ELEVATOR", "STAIR"] else None,
                    floor=curr.floor,
                    node_type=curr.node_type,
                )
            )

        # Final arrival step
        last = nodes[-1]
        steps.append(
            RouteStep(
                instruction=f"Arrive at your destination: {last.name}.",
                distance="0m",
                distance_meters=0.0,
                landmark=last.name,
                floor=last.floor,
                node_type=last.node_type,
            )
        )
        return steps


generate_turn_by_turn_instructions = InstructionGenerator.generate_instructions
