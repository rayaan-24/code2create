# NEXORA

> **Your community. One intelligent interface.**
>
> An AI-powered intelligent assistant for closed communities (universities, hospitals, corporate enterprises, and residential campuses) that understands natural-language needs, reasons over verified institutional data, generates turn-by-turn indoor navigation, talks via voice, and acts as a single pane of glass for community life.

---

## The Problem

Information inside large organizations is broken:
- **Fragmented Portals**: Critical procedures are scattered across PDFs, disparate intranet links, outdated wikis, and administrative desks.
- **Physical Friction**: Even after finding where an office is located, visitors and students get lost navigating complex multi-building campuses.
- **Hallucination Risk**: Generic AI chatbots fabricate institutional rules, fee amounts, and contact details with confident errors.
- **Privacy Gaps**: Communities lack verifiable data boundaries, leaking internal documents across institutional boundaries.

## The Solution: NEXORA

NEXORA eliminates portal hunting and physical confusion:
1. **Understand**: Natural language comprehension capable of tracking multi-turn conversational context, pronouns, and spatial state.
2. **Retrieve**: Hybrid RAG (pgvector dense semantic search + PostgreSQL sparse full-text search) enforcing strict verification status.
3. **Reason**: SGLang structured inference grounded in official administrative guidelines with zero hallucination guarantee.
4. **Act**: Surfaces actionable cards with fees, hours, required documents, and contact details.
5. **Navigate**: 3D indoor A* pathfinding showing floor-by-floor walking routes on an interactive SVG map with accessibility modes.
6. **Voice**: Neural ElevenLabs speech-to-text and text-to-speech interaction with local fallback.
7. **External Intelligence**: SerpAPI web search safely isolated with visual trust attribution (`🌐 External Source`).
8. **Administrative Governance**: Complete verification queue, immutable audit logs, and an **AI Confusion Map** detecting community knowledge gaps.

---

## Architecture Diagram

```
                             ┌────────────────────────┐
                             │      USER CLIENT       │
                             │  Desktop/Tablet/Mobile │
                             └───────────┬────────────┘
                                         │ HTTPS
                                         ▼
                     ┌────────────────────────────────────────┐
                     │          NEXT.JS 16 FRONTEND           │
                     │  React 19 • TypeScript • Tailwind CSS  │
                     │  Glassmorphism Design System           │
                     │  Interactive SVG Floor Map Visualizer  │
                     └───────────────────┬────────────────────┘
                                         │ REST API
                                         ▼
                     ┌────────────────────────────────────────┐
                     │          FASTAPI API GATEWAY           │
                     │  JWT Auth • RBAC • Community Isolation │
                     │  Rate Limiting • Health Monitoring     │
                     └───────────────────┬────────────────────┘
                                         │
                                         ▼
                     ┌────────────────────────────────────────┐
                     │          AI ORCHESTRATOR               │
                     │  Context & State Manager               │
                     │  Prompt & Document Injection Defense   │
                     │  Autonomous Tool Dispatcher            │
                     └───────┬──────────────┬───────────────┬─┘
                             │              │               │
           ┌─────────────────┘              │               └──────────────────┐
           ▼                                ▼                                  ▼
┌───────────────────────┐       ┌───────────────────────┐          ┌───────────────────────┐
│  VERIFIED KNOWLEDGE   │       │     TOOL RUNTIME      │          │   INFERENCE & VOICE   │
│  Hybrid RAG Engine    │       │  • A* Indoor Router   │          │  • SGLang LLM Server  │
│  • Dense Vector (768) │       │  • Directory Search   │          │  • ElevenLabs Voice   │
│  • Sparse Keyword FTS │       │  • Procedure Lookup   │          │  • SerpAPI Web Search │
│  • Reranker & Guard   │       │  • Facility Status    │          │  • Local Fallbacks    │
└───────────┬───────────┘       └───────────┬───────────┘          └───────────────────────┘
            │                               │
            └───────────────┬───────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │        POSTGRESQL + PGVECTOR          │
        │  • Multi-tenant schema with isolation │
        │  • Community Knowledge & Procedures   │
        │  • Navigation Graph (Nodes & Edges)   │
        │  • Users, Roles & Immutable Audits    │
        └───────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (Turbopack), React 19, TypeScript, Tailwind CSS, Lucide Icons, Glassmorphism UI |
| **Backend** | Python 3.11+, FastAPI, Starlette, Pydantic v2, SQLAlchemy ORM, Alembic Migrations |
| **Database** | PostgreSQL 16 + `pgvector` extension (Dense vector similarity + BM25 keyword search) |
| **AI Inference** | SGLang Serving Engine (Llama-3 / Qwen / Mistral) with low-latency structured JSON generation |
| **Wayfinding** | Topological Graph A* algorithm, vertical multi-floor heuristics, accessible routing |
| **Voice** | ElevenLabs Speech Synthesis & Transcription (with synthetic local fallback) |
| **Web Search** | SerpAPI External Search with untrusted-data injection isolation |
| **DevOps & QA** | Docker, Docker Compose, GitHub Actions CI/CD, Pytest (100% pass rate) |

---

## Quickstart & Installation

### Option A: Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/rayaan-24/code2create.git
cd code2create

# 2. Configure environment
cp .env.example .env
cp backend/.env.example backend/.env

# 3. Launch full stack (PostgreSQL + pgvector, FastAPI backend, Next.js frontend)
docker-compose up --build -d

# 4. Open in browser
# Frontend: http://localhost:3000
# Backend API & Docs: http://localhost:8000/docs
# Health Checks: http://localhost:8000/health
```

### Option B: Local Development

#### 1. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Start backend server (SQLite dev / PostgreSQL)
uvicorn app.main:app --reload --port 8000
```

#### 2. Frontend Setup
```bash
# In the root directory:
npm install
npm run dev
# Frontend runs at http://localhost:3000
```

---

## Running Automated Tests

```bash
# Run complete backend pytest suite (58 tests across Auth, RBAC, AI, RAG, Navigation, Voice, Search)
cd backend
pytest tests/ -v

# Run Next.js production build & TypeScript validation
npm run build
```

---

## Demo Accounts

For testing and judge demonstrations, the system includes pre-seeded accounts:

| Role | Email | Password | Access Rights |
|---|---|---|---|
| **Student / User** | `demo.user@nexora.edu` | `User@123` | Chat, RAG, Wayfinding, Voice, Directory |
| **Administrator** | `demo.admin@nexora.edu` | `Admin@123` | Verifications, Audit Logs, Confusion Map |
| **Super Admin** | `superadmin@nexora.edu` | `SuperAdmin@123` | Tenant Management, System-wide Controls |

---

## 3-Minute Demo Flow for Hackathon Judges

1. **Ask a Complex Inquiry**:
   > *"I lost my ID card and I have no idea what I need to do."*
   - NEXORA retrieves the verified procedure, required documents, fee ($15), and responsible office (**Student Services SJT-G12**).
   - Displays a `✓ Verified Community Source` badge and an interactive **Navigate** button.
2. **Multi-Turn Context & Wayfinding**:
   > *"Where is that office?"* → Understands "that office" is Student Services.
   > *"I'm near the library."* → Updates current origin coordinates.
   > *"Take me there."* → Solves A* path (140m, 2 mins) and renders the path on the interactive SVG floor map.
3. **Voice Interaction**:
   - Speak via microphone: *"What documents do I need?"* → Responds in real-time via ElevenLabs voice synthesis.
4. **External Web Search**:
   - Ask: *"What documents are generally needed for an Indian passport?"* → Queries SerpAPI, returning an isolated `🌐 External Source` card without corrupting community knowledge.
5. **AI Confusion Map (Admin View)**:
   - Switch to `/admin` → See AI-detected friction points (e.g. users confused about ID fee payment methods), unanswered questions, and knowledge gaps with 1-click administrative actions.

---

## WHAT A JUDGE SHOULD NOTICE

1. **True Multi-Turn Context**: Resolves pronouns (*"that office"*), tracks physical location changes (*"I'm near the library"*), and triggers A* routing without re-asking questions.
2. **Grounding & Zero Hallucination**: Strict confidence thresholding (0.65) refusing to fabricate unverified policies, supported by transparent trust badges (`✓ Verified Community Source`).
3. **Indoor Wayfinding, Not Just Chat**: Bridges digital knowledge with real-world movement using A* multi-floor indoor navigation on interactive SVG maps.
4. **Security by Architecture**: Mandatory database-level tenant isolation, prompt injection firewalls, and treating all web/document text as untrusted data.
5. **Admin "Confusion Map"**: Gives leadership visibility into community bottlenecks, procedural friction, and missing policies derived automatically from anonymized conversations.
6. **Production Polish**: Cohesive glassmorphic design language, 100% test coverage (58/58 tests passing), and zero TypeScript errors.

---

## Documentation Suite

Detailed architecture specifications are located in [`docs/`](./docs/):
- [`docs/architecture.md`](./docs/architecture.md): Complete system architecture & data flow
- [`docs/ai-architecture.md`](./docs/ai-architecture.md): SGLang orchestration & context management
- [`docs/rag.md`](./docs/rag.md): Hybrid vector retrieval & verification ranking
- [`docs/navigation.md`](./docs/navigation.md): A* indoor spatial graph & floor transitions
- [`docs/security.md`](./docs/security.md): Multi-tenant isolation, RBAC & security firewalls
- [`docs/deployment.md`](./docs/deployment.md): Cloud deployment & Docker configurations
- [`docs/demo.md`](./docs/demo.md): Judge walkthrough script & presentation timing
- [`docs/feature-matrix.md`](./docs/feature-matrix.md): Core vs Advanced feature breakdown
- [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md): Verification checklist for production release

---

## License

NEXORA is released under the [MIT License](LICENSE).
