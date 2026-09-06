# NEXORA Retrieval-Augmented Generation (RAG) Architecture

## 1. Overview & Objectives

NEXORA's RAG system enforces **strict community grounding**. In closed institutional environments, hallucinations produce costly real-world errors (e.g., advising students to pay fees at the wrong office or submit outdated forms).

Key Guarantees:
1. **Zero Confident Hallucination**: If knowledge is absent or unverified, NEXORA explicitly states that it cannot verify the information.
2. **Community Isolation**: Knowledge items are isolated by `community_id`; no cross-tenant vector leakage is possible.
3. **Verification Priority**: Admin-verified community sources take absolute precedence over pending documents or external search results.

---

## 2. Ingestion & Chunking Pipeline

```
Raw File Upload (PDF, DOCX, TXT)
        │
        ▼
[ Document Parser ] ──► Extracts clean textual content & structural headers
        │
        ▼
[ Semantic Chunker ] ──► Splits by paragraphs/sections (500 tokens, 100 token overlap)
        │
        ▼
[ Embedding Generator ] ──► Dense 768-dim vector embeddings
        │
        ▼
[ PostgreSQL + pgvector ] ──► Indexed with IVFFlat / HNSW on `community_id` partitions
```

---

## 3. Hybrid Retrieval Algorithm

NEXORA combines dense semantic vector search with sparse keyword search (BM25 / PostgreSQL full-text search) using Reciprocal Rank Fusion (RRF):

$$\text{RRF Score}(d) = \frac{1}{60 + \text{rank}_{\text{dense}}(d)} + \frac{1}{60 + \text{rank}_{\text{sparse}}(d)}$$

- **Dense Search**: Captures conceptual semantics (e.g., "misplaced campus badge" matches "lost student ID card").
- **Sparse Search**: Pinpoints exact identifiers, room numbers, course codes, and department names (e.g., "SJT-G12", "Fee: $15").

---

## 4. Source Priority & Conflict Resolution

When multiple sources provide information, NEXORA ranks authority in strict order:

$$\text{Current Verified Community Data} > \text{Older Verified Data} > \text{Pending Data} > \text{External Web Information}$$

- If an institutional procedure has been updated and verified by an administrator, the older version is deprecated.
- If two verified sources present conflicting information (e.g., office closes at 4 PM vs 5 PM), NEXORA transparently notes the discrepancy rather than fabricating certainty.

---

## 5. Trust Badges & Grounding UI

NEXORA exposes verifiable transparency directly in the chat user interface:
- `✓ Verified Community Source`: Grounded in verified institutional records with direct document link.
- `⚠ Needs Verification`: Derived from pending administrative uploads.
- `🌐 External Source`: Sourced from live SerpAPI search.
- `? Unable to Verify`: Safely returned when grounding threshold falls below 0.65.
