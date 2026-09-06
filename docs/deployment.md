# NEXORA Deployment & Infrastructure Guide

## 1. Production Topology

NEXORA's production deployment separates static edge presentation from stateful backend APIs, managed databases, and GPU inference servers:

```
                  ┌─────────────────────────────────────┐
                  │          Vercel / Cloudflare        │
                  │        Next.js Frontend (Edge)       │
                  └──────────────────┬──────────────────┘
                                     │ HTTPS
                                     ▼
                  ┌─────────────────────────────────────┐
                  │       Render / Railway / AWS        │
                  │       FastAPI Backend Service       │
                  └──────┬───────────┬────────────┬─────┘
                         │           │            │
            ┌────────────┘           │            └────────────┐
            ▼                        ▼                         ▼
┌───────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│  Managed PostgreSQL   │ │ GPU Node / RunPod    │ │ Cloud AI APIs        │
│  with pgvector        │ │ SGLang LLM Server    │ │ • ElevenLabs Voice   │
│  (Supabase / Neon)    │ │ (Llama-3-8B / Qwen)  │ │ • SerpAPI Web Search │
└───────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

---

## 2. Docker Local Deployment

For local testing or containerized single-host deployments, use Docker Compose:

```bash
# 1. Clone repository
git clone https://github.com/rayaan-24/code2create.git
cd code2create

# 2. Configure environment variables
cp .env.example .env
cp backend/.env.example backend/.env

# 3. Build and launch services
docker-compose up --build -d

# 4. Verify running health
docker-compose ps
curl http://localhost:8000/health
```

---

## 3. Platform Deployment Options

### Frontend (Vercel)
1. Import repository on [Vercel](https://vercel.com).
2. Framework Preset: **Next.js**.
3. Set Environment Variable:
   - `NEXT_PUBLIC_API_URL`: URL of your deployed FastAPI backend (e.g. `https://api.nexora.app`).
4. Click **Deploy**.

### Backend (Render / Railway)
1. Deploy as a Web Service from the `backend/` directory or using the `backend/Dockerfile`.
2. Build Command: `pip install -r requirements.txt`
3. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Set Required Environment Variables:
   - `DATABASE_URL`: PostgreSQL connection string with pgvector enabled.
   - `JWT_SECRET_KEY`: Minimum 32-character secret key.
   - `SGLANG_BASE_URL`: URL of SGLang inference server.
   - `ELEVENLABS_API_KEY`: Optional key for voice synthesis.
   - `SERPAPI_API_KEY`: Optional key for web search.
   - `BACKEND_CORS_ORIGINS`: JSON list of allowed frontend origins (e.g. `["https://nexora.app"]`).

### Managed PostgreSQL
Use any managed PostgreSQL 15+ provider supporting `pgvector`:
- **Supabase**: Enable vector extension (`CREATE EXTENSION IF NOT EXISTS vector;`).
- **Neon**: Vector extension supported out-of-the-box.
- **AWS RDS Aurora**: Supported with PostgreSQL 15.3+.

---

## 4. Database Migrations & Seeding

```bash
cd backend

# Run initial migrations
alembic upgrade head

# Seed demo dataset (buildings, nodes, edges, procedures, users)
python -m scripts.seed_demo_data
```
