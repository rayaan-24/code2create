# NEXORA Judge Walkthrough & 3-Minute Presentation Guide

## 1. Value Proposition (First 10 Seconds)
> **"Information inside large organizations is fragmented across portals, PDFs, emails, and physical desks. NEXORA replaces portal hunting with a single intelligent assistant that understands what you need, verifies official policies, answers by voice, and walks you directly to the office door."**

---

## 2. Live Demo Script (3-Minute Presentation)

### Step 1: Login & Dashboard (0:00 - 0:30)
- Log in with demo account: `demo.user@nexora.edu` / `User@123` (or click Quick Demo Login).
- Highlight the glassmorphic interface, active campus announcements, emergency alerts, and quick action cards.

### Step 2: Complex Institutional Inquiry & RAG Grounding (0:30 - 1:15)
- User asks:
  > *"I lost my ID card and I have no idea what I need to do."*
- **What to show judges**:
  - Structured Procedure card displaying step-by-step guidance.
  - Required documents and replacement fee ($15).
  - Responsible office name (**Student Services SJT-G12**) and operating hours.
  - Direct **Verified Community Source** badge linking back to verified institutional guidelines.
  - Interactive **"Navigate to Student Services"** button embedded directly inside the AI response.

### Step 3: Multi-Turn Context & Spatial Awareness (1:15 - 1:45)
- User asks:
  > *"Where is that office?"*
- System understands that "that office" refers to Student Services (SJT-G12) without repeating.
- User types:
  > *"I'm near the library."*
- System updates origin location state to Library Main Entrance.
- User commands:
  > *"Take me there."*
- **What to show judges**:
  - A* Indoor navigation calculates the optimal route (140 meters, ~2 minutes).
  - Interactive SVG map displays the highlighted path across the campus grounds.
  - Turn-by-turn walking directions are generated with accessibility notes.

### Step 4: Voice Interaction (ElevenLabs) (1:45 - 2:15)
- Click the **Microphone** button or switch to Voice Mode.
- Speak aloud:
  > *"What documents do I need?"*
- System processes speech, resolves context from the active procedure, and responds via high-fidelity ElevenLabs voice synthesis.

### Step 5: External Web Knowledge (SerpAPI) (2:15 - 2:40)
- User asks an external question:
  > *"What documents are generally needed for an Indian passport application?"*
- System recognizes this is outside community knowledge, safely calls SerpAPI, and attributes the answer with a distinct `🌐 External Source` card, preserving the integrity of community data.

### Step 6: Admin Governance & AI Confusion Map (2:40 - 3:00)
- Log in as admin: `demo.admin@nexora.edu` / `Admin@123`.
- Navigate to `/admin` and click the **Confusion Map** tab.
- **What to show judges**:
  - AI surfaces top friction points (e.g., users confused about ID fee payment methods).
  - Unanswered queries and high-priority knowledge gaps with 1-click administrative actions.
  - Institutional wayfinding heatmaps showing top requested physical destinations.

---

## 3. Demo Accounts & Credentials

| Role | Email | Password | Primary Purpose |
|------|-------|----------|-----------------|
| **Student / User** | `demo.user@nexora.edu` | `User@123` | General inquiries, indoor wayfinding, voice mode |
| **Administrator** | `demo.admin@nexora.edu` | `Admin@123` | Document verification, audit logs, Confusion Map |
| **Super Admin** | `superadmin@nexora.edu` | `SuperAdmin@123` | Multi-community tenant management |
