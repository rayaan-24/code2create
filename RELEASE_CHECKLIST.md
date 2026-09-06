# NEXORA Production Release Checklist

### 1. Environment & Secrets
- [x] No plaintext API keys or credentials committed to Git.
- [x] `.env.example` and `backend/.env.example` contain clear template variables.
- [x] `.gitignore` contains `.env`, `.env.local`, `*.db`, `__pycache__`, and virtual environments.
- [x] JWT secret key configured via environment variables.

### 2. Database & Data Integrity
- [x] PostgreSQL schemas configured with strict foreign keys and cascading rules.
- [x] `pgvector` vector extension enabled for dense semantic indexing.
- [x] Multi-tenant `community_id` indexing on all operational tables.
- [x] Automated migrations through Alembic.
- [x] Demo dataset seeded with buildings, waypoints, procedures, and users.

### 3. Backend & API Reliability
- [x] Modular health checks implemented (`/health`, `/health/database`, `/health/ai`, `/health/search`, `/health/voice`).
- [x] Standard error envelope responses for all HTTP exceptions.
- [x] Zero unhandled 500 error leakages of internal stack traces.
- [x] Rate limiting protecting `/chat`, `/voice`, and `/search/web`.

### 4. Frontend & User Experience
- [x] Clean Turbopack compilation with zero TypeScript errors across all 14 routes.
- [x] Responsive layout verified from mobile (360x800) to 4K desktop (1920x1080).
- [x] Glassmorphism design tokens consistent across all cards, modals, and tables.
- [x] Accessible color contrast ratios, focus states, and ARIA labels.

### 5. AI Orchestration & RAG Quality
- [x] Hybrid dense vector + sparse keyword search with Reciprocal Rank Fusion.
- [x] Semantic chunking with header boundary preservation.
- [x] Grounding refusal enforced under 0.65 similarity threshold.
- [x] Source priority: Current Verified > Older Verified > Pending > External.
- [x] SGLang structured inference with robust local fallback.

### 6. Indoor Navigation
- [x] A* pathfinding algorithm tested across multi-room, multi-floor, and multi-building routes.
- [x] Accessible routing mode avoiding staircases.
- [x] Interactive SVG floor plan renderer with route glowing polylines.
- [x] Walking distance and ETA calculations.

### 7. Voice & External Search
- [x] ElevenLabs speech synthesis and transcription integration.
- [x] Local synthetic audio fallback when external service keys are unset.
- [x] SerpAPI external search with dedicated `🌐 External Source` visual attribution.
- [x] Strict prompt injection defenses treating external search results as untrusted data.

### 8. Governance & Analytics
- [x] Administrator verification queue for documents and policies.
- [x] Immutable security audit log tracking actor IDs, IPs, and actions.
- [x] AI Confusion Map and Knowledge Gap analytics dashboard.

### 9. Testing & CI/CD
- [x] 100% backend test pass rate (58/58 tests passing).
- [x] Next.js production build passing with 14 static pages generated.
- [x] Dockerfile and docker-compose configurations tested.
- [x] GitHub Actions automated validation workflow defined.
