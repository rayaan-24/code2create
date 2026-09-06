# NEXORA — Intelligent Closed-Community Platform

> **"Your Community. One Intelligent Interface."**
> An AI-powered intelligent assistant for closed communities such as universities, hospitals, corporate enterprises, and residential campuses.

---

## Overview

NEXORA re-imagines how members interact with their institutions. Instead of digging through static PDFs, maze-like portal navigation, or fragmented intranet links, members describe what they need in natural language. NEXORA reasons over verified community truth, surfaces actionable structured cards, connects users to responsible officials, and provides indoor turn-by-turn navigation.

---

## Core Concept Workflow

```
USER DESCRIBES WHAT THEY NEED
       ↓
SYSTEM UNDERSTANDS INTENT & CONTEXT
       ↓
RETRIEVES VERIFIED COMMUNITY INFORMATION
       ↓
AI REASONS OVER THE INFORMATION
       ↓
GIVES ACTIONABLE RESPONSE (Procedures, Officers, Hours)
       ↓
FINDS PEOPLE & SERVICES
       ↓
NAVIGATES USER INDOORS VIA TURN-BY-TURN GUIDANCE
```

---

## Technology Stack

### Frontend (Phase 1 — Current)
- **Framework**: Next.js 16 (App Router) with React 19
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4 + Dark-mode-first Glassmorphism Design System
- **Icons**: Lucide React
- **Validation**: React Hook Form + Zod
- **Architecture**: Modular presentation, abstracted API service layer (`lib/api/*`), centralized types (`lib/types/*`), and separated mock data (`lib/mock-data/*`)

### Backend (Phase 2 — Upcoming)
- **Runtime**: Python 3.11 + FastAPI
- **Database**: PostgreSQL with `pgvector` extension
- **LLM Inference**: SGLang (Low-latency structured JSON generation)
- **Voice Synthesis**: ElevenLabs Neural HD TTS
- **External Search**: SerpAPI

---

## Project Structure

```
Nexora/
├── app/
│   ├── layout.tsx              # Root HTML shell, fonts, SEO meta
│   ├── globals.css             # Glassmorphism tokens & CSS variables
│   ├── page.tsx                # Premium landing page & interactive preview
│   ├── login/page.tsx          # Glassmorphism login with validation
│   ├── register/page.tsx       # Multi-role community registration
│   ├── dashboard/page.tsx      # Main dashboard with greeting & quick actions
│   ├── chat/page.tsx           # Full conversational AI assistant
│   ├── map/page.tsx            # Indoor navigation UI shell & floor selector
│   ├── people/page.tsx         # Searchable directory with department filters
│   ├── services/page.tsx       # Categorized community services discovery
│   ├── profile/page.tsx        # User profile & credentials view
│   ├── settings/page.tsx       # Voice, language, appearance & privacy settings
│   └── admin/page.tsx          # Admin governance console & verification table
├── components/
│   ├── ui/                     # GlassCard, GlassButton, GlassInput, GlassModal, etc.
│   ├── layout/                 # AppShell, AppSidebar, AppNavbar
│   ├── chat/                   # MessageItem, ChatInput, ProcedureCard, LocationCard, etc.
│   └── shared/                 # LoadingSkeleton, EmptyState, ErrorBanner
├── lib/
│   ├── api/                    # Client service layer (chat, users, people, etc.)
│   ├── mock-data/              # Strongly-typed campus & community datasets
│   ├── types/                  # Centralized TypeScript definitions
│   ├── constants/              # Navigation links, roles, categories
│   └── utils.ts                # Tailwind class merger & date formatters
├── docs/
│   ├── architecture.md         # Full architecture specification
│   ├── ui-design.md            # Glassmorphism tokens & guidelines
│   └── development-roadmap.md  # Multi-phase milestone roadmap
├── .env.example                # Safe environment variables template
└── README.md
```

---

## Getting Started

### 1. Prerequisites
- Node.js 18+ (Node 20+ recommended)
- npm or pnpm

### 2. Installation
```bash
# Clone repository
git clone https://github.com/your-org/nexora.git
cd nexora

# Install dependencies
npm install
```

### 3. Environment Variables
Copy the template to create your local `.env`:
```bash
cp .env.example .env.local
```

### 4. Running the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## Available Routes

| Route | Purpose |
|---|---|
| `/` | Landing page featuring hero, live assistant mockup & workflow |
| `/login` | Institutional login with email & password validation |
| `/register` | Registration with role selection (Student, Faculty, Staff, Visitor) |
| `/dashboard` | Main hub with greeting, shortcuts, recents & announcements |
| `/chat` | Conversational assistant with structured response cards |
| `/map` | Indoor wayfinding shell with turn-by-turn guidance |
| `/people` | Searchable directory with live filters & profile modals |
| `/services` | Community services directory (Academic, IT, Medical, etc.) |
| `/profile` | Institutional profile & verification status |
| `/settings` | Voice models, language selection & notification toggles |
| `/admin` | Administration & knowledge verification console |

---

## Current Phase Status: Phase 1 Complete

✅ **Phase 1 Objectives Achieved:**
- Next.js 16 + React 19 + TypeScript strict mode project established.
- Dark-mode-first glassmorphism design system implemented.
- All 11 major application routes created and fully styled.
- Rich structured AI cards (`ProcedureCard`, `LocationCard`, `PersonCard`, `ServiceCard`, `SourceCard`) built.
- Reusable UI component library created with error, loading, and empty states.
- Clean API service abstraction layer in place to enable zero-refactor FastAPI integration in Phase 2.
- No secrets committed; mock data isolated under `lib/mock-data/`.

⏩ **Intentionally Reserved for Phase 2:**
- FastAPI backend server & PostgreSQL/pgvector integration.
- SGLang inference pipeline & RAG vector embedding store.
- Real ElevenLabs WebSocket audio streaming.
- A* 3D indoor pathfinding graph computation.
