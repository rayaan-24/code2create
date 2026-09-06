# NEXORA Development Roadmap

## Phase 1: Foundation & Polished Frontend Architecture (COMPLETED)
- [x] Next.js 16 App Router foundation with TypeScript strict mode
- [x] Tailwind CSS v4 design system with custom dark-mode-first glassmorphic tokens
- [x] Reusable component library (`GlassCard`, `GlassButton`, `GlassInput`, `GlassModal`, `GlassBadge`)
- [x] Responsive layout shell with collapsible sidebar and mobile drawer (`AppShell`)
- [x] Premium Landing Page with assistant mockup preview & workflow diagram
- [x] Auth flows: Glassmorphic Login & Multi-Role Community Registration with Zod validation
- [x] Main Dashboard with personalized greeting, quick action cards, and announcements
- [x] Conversational AI Chat interface with collapsible history and voice input toggle
- [x] Rich structured response components: `ProcedureCard`, `LocationCard`, `PersonCard`, `ServiceCard`, `SourceCard`
- [x] Indoor Navigation UI shell with route steps, ETA, and floor level selection
- [x] Searchable People Directory with role/status badges and profile modals
- [x] Campus Services Discovery categorized into Academic, Facilities, IT, Health, etc.
- [x] User Profile and Comprehensive Settings (Appearance, ElevenLabs voice models, Privacy)
- [x] Admin Governance Console UI shell with KPI metrics and verification queue actions
- [x] Abstracted API client layer (`lib/api/*`) and separated mock data (`lib/mock-data/*`)
- [x] Comprehensive documentation and environment variable configuration

---

## Phase 2: Backend Architecture & Real Data Integration (NEXT)
- [ ] **Python / FastAPI Backend Setup**:
  - Modular router structure (`/api/v1/chat`, `/api/v1/directory`, `/api/v1/navigation`, etc.)
  - Pydantic models matching `lib/types/index.ts`
  - JWT Authentication & institutional SSO integration
- [ ] **PostgreSQL & pgvector Database**:
  - Relational schema for Users, Departments, Locations, and Announcements
  - Vector embeddings table for verified community documents and institutional handbooks
  - Document ingestion pipeline (PDF/Markdown chunking and embedding)
- [ ] **SGLang LLM Inference Engine**:
  - Low-latency structured JSON generation for procedures, locations, and citations
  - RAG prompt orchestration with strict ground truth boundaries (zero hallucinations)
- [ ] **Indoor Navigation Engine**:
  - Graph-based 3D A* pathfinding algorithm connecting campus nodes, stairs, and elevators
  - Real-time BLE beacon / Wi-Fi RSSI positioning integration
- [ ] **Voice & External Search**:
  - ElevenLabs WebSocket streaming TTS integration
  - SerpAPI hybrid fallback search for external queries

---

## Phase 3: Production Hardening, Mobile App & Launch
- [ ] PWA offline support & push notification service worker
- [ ] End-to-end telemetry and moderation logging
- [ ] Multi-tenant organizational partitioning
- [ ] Native iOS and Android shell wrappers via Capacitor
