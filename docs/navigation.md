# NEXORA Indoor Navigation & Wayfinding Architecture

## 1. Overview

NEXORA provides a complete 3D indoor wayfinding engine designed for multi-building institutional complexes. Unlike generic GPS (which fails indoors and cannot resolve vertical floors), NEXORA models physical campuses as topological graphs with floor-aware Euclidean heuristics.

---

## 2. Spatial Graph Data Model

The spatial layout is defined in PostgreSQL using two interconnected models:

### `NavigationNode`
- `id`: Unique identifier (e.g., `node-sjt-g12`, `node-lib-ent`).
- `building`: Campus building identifier (e.g., `SJT`, `Library`, `Tech Park`).
- `floor`: Floor identifier (`Ground Floor`, `Floor 1`, `Floor 2`).
- `x, y`: Coordinate points in meters on the building's floor plan.
- `node_type`: Category (`room`, `hallway`, `stairs`, `elevator`, `entrance`, `restroom`).
- `is_accessible`: Boolean indicating wheelchair and mobility accessibility.

### `NavigationEdge`
- `source_node_id`, `target_node_id`: Connected waypoint IDs.
- `weight`: Distance in meters.
- `is_accessible`: Flags whether wheelchair users can traverse this segment.
- `edge_type`: `walkway`, `doorway`, `stairs`, `elevator`.

---

## 3. A* Pathfinding Algorithm

The router uses the classic A* search algorithm:

$$f(n) = g(n) + h(n)$$

Where:
- $g(n)$ is the exact accumulated traversal cost from the start node.
- $h(n)$ is the Euclidean distance heuristic to the destination:
  $$h(n) = \sqrt{(x_n - x_d)^2 + (y_n - y_d)^2} + \text{VerticalPenalty} \times |\text{floor}_n - \text{floor}_d|$$

### Accessible Routing (`requires_accessible=True`)
When a user requests wheelchair or stroller accessible routing:
- Staircase edges and non-accessible nodes are pruned from the candidate graph.
- Paths are routed through elevators and ramps, guaranteeing accessible transit.

---

## 4. Multi-Floor Transitions

When navigating between floors or across outdoor walkways connecting separate buildings:
1. The router identifies transition nodes (`elevator`, `stairs`, `bridge`).
2. The user is guided to the transition point with explicit instructions (e.g., *"Take the SJT Central Elevator to Floor 1"*).
3. The interactive frontend map dynamically switches floor views as the user progresses along the route.

---

## 5. UI Integration & Interactive Map

- **SVG Vector Rendering**: Renders lightweight, scalable 2D floor plans with room labels, building boundaries, and waypoints.
- **Dynamic Route Drawing**: Highlights active paths with animated glowing polylines and distinct start/destination pins.
- **Turn-by-Turn Directions**: Generates readable step-by-step guidance, total walking distance (in meters), and estimated time of arrival (ETA in minutes).
