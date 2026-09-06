# NEXORA Security, Isolation & Governance Architecture

## 1. Multi-Tenant Community Isolation

Community isolation is the primary security boundary in NEXORA. Data belonging to Community A must never be visible, searchable, or accessible by users of Community B.

### Architectural Controls
- **Mandatory Filter Injection**: All database queries through SQLAlchemy explicitly inject `community_id == current_user.community_id`.
- **Vector Search Partitioning**: Vector similarity searches query only chunk embeddings tagged with the authenticated user's `community_id`.
- **Zero Leakage Error Handling**: Querying resources from other communities returns `404 Not Found` rather than `403 Forbidden`, preventing resource enumeration attacks.

---

## 2. Authentication & Session Management

- **Password Hashing**: Cryptographic password hashing using `bcrypt` / `passlib` with salt.
- **JWT Architecture**: Statelss JSON Web Tokens signed using `HS256` with strict expiration windows (`ACCESS_TOKEN_EXPIRE_MINUTES`).
- **Secret Protection**: JWT signing keys and external API keys are injected solely through backend environment variables and never exposed to the frontend bundle.

---

## 3. Role-Based Access Control (RBAC)

NEXORA defines five granular roles enforced on both frontend and backend:

| Role | Permissions |
|------|-------------|
| `USER` | Ask questions, search directory, navigate, view announcements. |
| `FACULTY` | Standard user capabilities + edit department course notices. |
| `STAFF` | Standard user capabilities + update service operating hours. |
| `ADMIN` | Manage community procedures, verify uploaded documents, review audit logs, access Confusion Map analytics. |
| `SUPER_ADMIN` | System-wide operations, create new community tenants, global infrastructure management. |

Backend route handlers enforce access using FastAPI dependency injection (e.g., `Depends(require_admin)`).

---

## 4. AI Security & Prompt Injection Mitigation

- **Heuristic Pattern Guard**: Scans incoming messages for prompt injection, jailbreak attempts, and credential extraction requests.
- **Data Boundary Containment**: Grounding documents and web search results are treated as untrusted text strings within delimited data blocks, stripping imperative commands.
- **Tool Authorization**: AI tools independently verify user credentials, active community scope, and input bounds before execution.
- **Agent Loop Protection**: Capped tool invocation depth prevents infinite execution loops.

---

## 5. Rate Limiting & Audit Logging

- **Sliding-Window Rate Limiter**: Restricts resource-heavy endpoints (`/chat`, `/voice`, `/search/web`, `/documents`) against denial-of-service or token exhaustion attacks.
- **Immutable Audit Trail**: Administrative actions (document verifications, policy updates, role modifications) are written to an append-only `AuditLog` table capturing actor ID, action type, IP address, and timestamp.
