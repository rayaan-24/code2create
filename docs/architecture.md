# NEXORA System Architecture (Phase 1 Foundation)

## 1. Architectural Overview

NEXORA is designed as a decoupled, modular system engineered specifically for closed institutional communities (e.g. universities, medical campuses, corporate facilities). The architecture separates the user-facing glassmorphism application from the underlying AI reasoning and spatial indexing pipelines.

```
+-------------------------------------------------------------------------+
|                          NEXORA FRONTEND                                |
|   Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS        |
+-------------------------------------------------------------------------+
       |                           |                          |
       v                           v                          v
+--------------+           +---------------+          +---------------+
|  UI Shell    |           |  API Service  |          |  Mock Data    |
|  Components  |           |  Abstraction  |          |  Repository   |
| (GlassCard,  |           | (lib/api/*)   | <------> | (lib/mock/*)  |
|  GlassModal) |           |               |          |               |
+--------------+           +---------------+          +---------------+
                                   |
                  (Phase 2 REST / WebSocket Proxy)
                                   |
                                   v
+-------------------------------------------------------------------------+
|                          NEXORA BACKEND (PHASE 2)                       |
|   FastAPI + PostgreSQL + pgvector + SGLang + ElevenLabs + SerpAPI       |
+-------------------------------------------------------------------------+
```

## 2. Frontend Layering

1. **Presentation & Glass System (`components/ui/*`, `app/globals.css`)**:
   - Implements custom CSS tokens for dark layered gradients, frosted blur backgrounds (`backdrop-blur-md/lg`), restrained luminous borders, and fluid hover states.
   - Built with strict accessibility contrast ratios and keyboard navigability.

2. **Domain-Specific Components (`components/chat/*`, `components/navigation/*`, etc.)**:
   - `ProcedureCard`: Structured multi-step institutional instructions with office hours, location pins, and required documents.
   - `LocationCard`: Room-level indoor details with accessibility badges and direct navigation action.
   - `PersonCard`: Directory listing with real-time status and office hours.
   - `ServiceCard`: Category-tagged services with priority and emergency routing.

3. **API Service Abstraction (`lib/api/*`)**:
   - Decouples all React components from data fetching details.
   - Exposes clean interfaces (`chatApi`, `usersApi`, `locationsApi`, `servicesApi`, `peopleApi`, `navigationApi`, `adminApi`).
   - In Phase 1: Resolves typed mock data with simulated network latency.
   - In Phase 2: Will route to real FastAPI endpoints without requiring component rewrites.

4. **Type Centralization (`lib/types/index.ts`)**:
   - Single source of truth for all domain entities (`User`, `Conversation`, `ChatMessage`, `ProcedureItem`, `LocationItem`, `NavigationRoute`, etc.).

## 3. Phase 2 Backend Integration Strategy

In Phase 2, the FastAPI server will expose the following endpoint contracts:
- `POST /api/v1/chat/message`: RAG pipeline query with vector retrieval and SGLang reasoning.
- `GET /api/v1/directory/people`: Parametric search over PostgreSQL institutional directory.
- `GET /api/v1/locations/route`: A* pathfinding graph solver across 3D building floor grids.
- `POST /api/v1/voice/synthesize`: ElevenLabs streaming TTS integration.
- `GET /api/v1/admin/verifications`: Moderation and document ingestion queues.
