# NEXORA AI Orchestration & Intelligence Architecture

## 1. Architectural Philosophy

NEXORA avoids naive "all-in-prompt" LLM wrappers. The Large Language Model (served via **SGLang**) serves as a reasoning and natural-language comprehension engine, while **FastAPI** acts as the deterministic controller, security firewall, and state manager.

```
Incoming User Message
        │
        ▼
[ 1. Prompt Injection & Safety Guard ] ────(Suspicious?)────► Safe Refusal Response
        │ Clean
        ▼
[ 2. Context & State Manager ]
  • Resolves pronouns ("that office", "it")
  • Tracks current location ("near library")
  • Preserves procedure in progress
        │
        ▼
[ 3. Intent Classification & Router ]
        ├── Community Knowledge ──► Hybrid RAG Engine
        ├── Physical Navigation ──► A* Wayfinding Tool
        ├── Directory Lookup    ──► People / Services Tool
        └── General Knowledge   ──► SerpAPI External Search
        │
        ▼
[ 4. SGLang Model Inference (Structured Generation) ]
  • Generates grounded reasoning
  • Decides tool invocations or returns response
        │
        ▼
[ 5. Grounding & Hallucination Guard ]
  • Validates claims against source chunk IDs
  • Applies confidence threshold (>= 0.65)
        │
        ▼
Actionable Response + UI Badges + Structured Action Cards
```

---

## 2. SGLang Integration & Inference Engine

- **High-Throughput Serving**: Connects to an SGLang server running on GPU infrastructure via OpenAI-compatible `/v1/chat/completions` API.
- **Constrained Decoding**: Enforces structured JSON output schema matching `AIResponse` Pydantic models.
- **Deterministic Offline Fallback**: In non-GPU development or CI/CD test environments, the engine seamlessly falls back to a deterministic heuristic matcher, ensuring 100% test reliability without needing live inference servers.

---

## 3. Conversation Context & State Management

Conversations in closed communities naturally span multiple turns with implicit references:

```
Turn 1: "I lost my ID card and I don't know what to do."
  → State: active_procedure = "ID Card Replacement", destination_location = "Student Services (SJT-G12)"

Turn 2: "Where is that office?"
  → Reference Resolver: "that office" = "Student Services (SJT-G12)"
  → Response: Location details, building, floor, hours.

Turn 3: "I'm near the library."
  → State: current_location = "Library Main Entrance"

Turn 4: "Take me there."
  → Router: Calculates A* path from "Library Main Entrance" to "Student Services (SJT-G12)"
  → Response: Complete step-by-step route + interactive map trigger.

Turn 5: "How long will it take?"
  → Context: Knows current active route (140m, ~2 mins walking).
```

---

## 4. Multi-Layer AI Security

### Prompt Injection Defense
- Regular expression pattern checks detecting jailbreak signatures (`ignore instructions`, `system prompt`, `override rules`, `reveal credentials`).
- Prompt sanitization stripping delimiter attacks before LLM ingestion.

### Document Injection Defense
- RAG document chunks are enclosed in strict XML `<document_data>` containers.
- The system prompt explicitly commands the model to treat all document and web text as **untrusted data**, never as executable instructions.

### Tool Call Depth Limiter
- Tool recursion is strictly capped at 3 hops per user turn.
- Infinite execution loops between LLM and tools are prevented by hard step limits and request timeouts.
