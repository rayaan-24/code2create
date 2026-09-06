# NEXORA Hackathon Feature Matrix

## Capabilities Classification

This matrix details the scope and maturity level of NEXORA's capabilities for hackathon evaluation:

| Category | Capability | Tier | Status | Implementation Details |
|----------|------------|------|--------|------------------------|
| **Core Assistant** | Conversational Chat UI | **CORE** | Complete | Next.js 16 + React 19 glassmorphism interface |
| **Core Assistant** | JWT Authentication & Sessions | **CORE** | Complete | Stateless JWT Bearer tokens with auto-refresh |
| **Core Assistant** | Multi-Tenant Community Isolation | **CORE** | Complete | Mandatory database-level `community_id` filtering |
| **Core Assistant** | Role-Based Access Control (RBAC) | **CORE** | Complete | 5-tier role enforcement (`USER` to `SUPER_ADMIN`) |
| **AI & RAG** | Hybrid Retrieval (Vector + BM25) | **CORE** | Complete | pgvector dense similarity + PostgreSQL FTS |
| **AI & RAG** | Semantic Chunker & Parser | **CORE** | Complete | 500-token window with 100-token boundary overlap |
| **AI & RAG** | Verification & Grounding Guard | **CORE** | Complete | Zero-hallucination refusal under 0.65 threshold |
| **AI & RAG** | Source Priority Ordering | **CORE** | Complete | Verified Institutional > Pending > External Web |
| **AI & RAG** | SGLang Inference Engine | **CORE** | Complete | Structured generation with local offline fallback |
| **AI & RAG** | Multi-Turn Context Manager | **CORE** | Complete | Pronoun reference and spatial state tracking |
| **Wayfinding** | A* Indoor Pathfinding Engine | **CORE** | Complete | Heuristic graph solver with 3D floor transitions |
| **Wayfinding** | Accessible Routing | **CORE** | Complete | Wheelchair-accessible route pruning (avoids stairs) |
| **Wayfinding** | Interactive SVG Indoor Map | **CORE** | Complete | Dynamic route rendering, floor switchers, pin markers |
| **Voice** | ElevenLabs Speech Synthesis | **ADVANCED** | Complete | Realistic streaming TTS with local audio synthesis |
| **Voice** | Audio Transcription (STT) | **ADVANCED** | Complete | Whisper / ElevenLabs speech-to-text API |
| **Search** | SerpAPI External Web Search | **ADVANCED** | Complete | Isolated fallback search for external queries |
| **Search** | Web Injection Sanitization | **ADVANCED** | Complete | External content treated as untrusted data blocks |
| **Governance** | Admin Verification Queue | **ADVANCED** | Complete | Moderate and approve pending guidelines & docs |
| **Governance** | Immutable Audit Log Trail | **ADVANCED** | Complete | Security events tracking actor, IP, timestamp |
| **Governance** | AI Confusion Map Analytics | **ADVANCED** | Complete | Aggregates user friction, missing policies, and gaps |
| **DevOps** | Containerization (Docker) | **ADVANCED** | Complete | `docker-compose.yml` with pgvector, backend, frontend |
| **DevOps** | CI/CD GitHub Actions | **ADVANCED** | Complete | Automated lint, pytest suite, and Next.js build |
| **Future** | BLE Beacon / QR Code Positioning | **OPTIONAL** | Roadmap | Physical campus landmark positioning via camera |
| **Future** | Native Multilingual RAG | **OPTIONAL** | Roadmap | Auto-translation for international campus guests |
