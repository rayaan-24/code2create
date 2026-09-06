# NEXORA Complete System Architecture

NEXORA is an AI-powered closed-community assistant engineered for universities, corporate campuses, hospitals, and residential organizations. It connects conversational AI, verified institutional knowledge, 3D indoor wayfinding, voice interaction, and external web intelligence into a unified, privacy-isolated platform.

---

## 1. High-Level Architecture Diagram

```
                              ┌────────────────────────┐
                              │      USER CLIENT       │
                              │  Desktop/Tablet/Mobile │
                              └───────────┬────────────┘
                                          │ HTTPS / WSS
                                          ▼
                      ┌────────────────────────────────────────┐
                      │        FRONTEND PRESENTATION           │
                      │     Next.js 16 + React 19 + TS         │
                      │     Tailwind CSS + Glassmorphism       │
                      │     Interactive SVG Indoor Map         │
                      └───────────────────┬────────────────────┘
                                          │ REST API
                                          ▼
                      ┌────────────────────────────────────────┐
                      │          FASTAPI API GATEWAY           │
                      │  JWT Auth & Sessions • RBAC Guard      │
                      │  Tenant Community Isolation Filter     │
                      │  Rate Limiting • Structured Logging    │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │          AI ORCHESTRATOR               │
                      │  Intent Classification • Context Mgr   │
                      │  Safety & Prompt Injection Firewalls   │
                      │  Autonomous Tool Dispatcher            │
                      └───────┬──────────────┬───────────────┬─┘
                              │              │               │
            ┌─────────────────┘              │               └──────────────────┐
            ▼                                ▼                                  ▼
┌───────────────────────┐        ┌───────────────────────┐          ┌───────────────────────┐
│  VERIFIED KNOWLEDGE   │        │     TOOL ECOSYSTEM    │          │    INFERENCE & VOICE  │
│  Hybrid RAG Engine    │        │  • A* Indoor Router   │          │  • SGLang LLM Server  │
│  • Dense Vector (768) │        │  • Directory Search   │          │  • ElevenLabs Voice   │
│  • Sparse Keyword FTS │        │  • Procedure Lookup   │          │  • SerpAPI Web Search │
│  • Reranker & Guard   │        │  • Facility Status    │          │  • Local Fallbacks    │
└───────────┬───────────┘        └───────────┬───────────┘          └───────────────────────┘
            │                                │
            └────────────────┬───────────────┘
                             │
                             ▼
         ┌───────────────────────────────────────┐
         │       POSTGRESQL + PGVECTOR           │
         │  • Multi-tenant schema with isolation │
         │  • Community Knowledge & Procedures   │
         │  • Navigation Graph (Nodes & Edges)   │
         │  • Users, Roles & Immutable Audits    │
         └───────────────────────────────────────┘
```

---

## 2. Core Architectural Subsystems

### A. Frontend Presentation Layer
- **Framework**: Next.js 16 with Turbopack, React 19, TypeScript.
- **Styling**: Tailwind CSS with custom glassmorphism design system (`backdrop-blur-md`, luminous borders, HSL dark-mode palette).
- **State & Communication**: Modular API service abstractions (`/lib/api/*`) with end-to-end TypeScript interfaces.
- **Accessibility**: ARIA labels, semantic markup, keyboard navigability, high-contrast readable surfaces.

### B. Backend API Gateway
- **Framework**: FastAPI (Python 3.11+), Starlette, Pydantic v2.
- **Security Middleware**: CORS whitelist, JWT Bearer authentication, Role-Based Access Control (`USER`, `FACULTY`, `STAFF`, `ADMIN`, `SUPER_ADMIN`).
- **Community Isolation**: Multi-tenant data segregation enforced at the database query layer via mandatory `community_id` filtering.
- **Reliability**: Structured JSON logging, request tracing, comprehensive error envelopes, and rate limiting.

### C. AI Orchestration Engine
- **Role**: FastAPI acts as the central brain orchestrating LLM calls, tool executions, and retrieval pipelines.
- **Inference Engine**: SGLang high-throughput LLM server (compatible with Llama-3, Mistral, Qwen) with deterministic offline fallbacks for continuous development and test resilience.
- **Context Management**: Multi-turn conversation state machine tracking pronoun references, intermediate user coordinates, active procedures, and spatial destinations.
- **Security**: Pre-execution prompt injection sanitization, document injection defenses (treating text as untrusted data), and recursion depth limits.

### D. Verified Hybrid RAG Pipeline
- **Storage**: PostgreSQL with `pgvector` extension.
- **Chunking**: Semantic boundary-preserving chunking (500 tokens, 100 token overlap).
- **Retrieval**: Hybrid dense vector similarity (cosine) + sparse keyword full-text search.
- **Reranker**: Prioritizes verified community knowledge over pending/expired items, enforcing a minimum grounding confidence threshold (0.65).

### E. A* Indoor Navigation Engine
- **Representation**: Topological graph consisting of 2D/3D waypoints (`NavigationNode`) and bidirectional passages (`NavigationEdge`).
- **Algorithm**: A* heuristic search minimizing Euclidean distance and vertical penalty factors.
- **Specialized Routing**: Supports accessible routes avoiding stairs (`requires_accessible=True`).
- **Interactive UI**: Multi-floor SVG visualizer with floor toggles, turn-by-turn instruction manifests, distance calculation, and walking ETAs.

### F. Voice & External Intelligence
- **Voice**: ElevenLabs streaming text-to-speech synthesis and speech-to-text transcription with local synthetic waveform audio fallback.
- **Search**: SerpAPI web search integration reserved exclusively for general external knowledge queries, isolated by clear visual attribution cards (`🌐 External Source`).
