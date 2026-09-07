from fastapi import FastAPI, Request, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.database.session import SessionLocal, engine, get_db
from app.database.base import Base
import app.models  # Ensure all models are registered

# Import route modules
from app.api.routes import (
    auth,
    users,
    communities,
    locations,
    people,
    services,
    procedures,
    documents,
    announcements,
    admin,
    chat,
    navigation,
    voice,
    search,
)

setup_logging()

# Automatically ensure pgvector extension on PostgreSQL, then create tables if not existing
try:
    if engine.dialect.name == "postgresql":
        with engine.connect() as conn:
            conn.execution_options(isolation_level="AUTOCOMMIT")
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.commit()
            logger.info("Ensured pgvector extension in PostgreSQL.")
except Exception as ext_err:
    logger.warning(f"pgvector extension check notice: {ext_err}")

try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema initialized successfully.")
except Exception as err:
    logger.warning(f"Database schema auto-creation skipped: {err}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Intelligent Closed-Community Assistant API: Auth, RBAC, Multi-Tenant Isolation, Knowledge & Verification.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global Exception Handlers for standard ErrorEnvelope responses
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        code = exc.detail.get("code", "ERROR")
        message = exc.detail.get("message", "An error occurred")
        details = exc.detail.get("details", None)
    else:
        code = f"HTTP_{exc.status_code}"
        message = str(exc.detail)
        details = None

    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": code, "message": message, "details": details}},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request payload validation failed",
                "details": exc.errors(),
            }
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled server exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred. Please contact system administration.",
            }
        },
    )


# Root & Health checks
@app.get("/", tags=["Root"])
@app.head("/", tags=["Root"])
def root_endpoint():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "docs": "/docs",
        "health": "/health",
        "api_v1": settings.API_V1_STR,
        "version": "1.0.0",
    }


@app.get("/health", tags=["Health"])
@app.get(f"{settings.API_V1_STR}/health", tags=["Health"])
async def health_check(db: Session = Depends(get_db)):
    """
    Unified system health check distinguishing healthy, degraded, or unavailable.
    Does not expose sensitive infrastructure details publicly.
    """
    db_status = "unavailable"
    try:
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        logger.exception(f"DB health check error: {e}")
        db_status = "unavailable"

    ai_status = "degraded"
    if settings.effective_llm_api_key:
        ai_status = "healthy"
    else:
        try:
            async with httpx.AsyncClient(timeout=1.5) as client:
                resp = await client.get(f"{settings.effective_llm_base_url.rstrip('/')}/v1/models")
                if resp.status_code == 200:
                    ai_status = "healthy"
        except Exception:
            ai_status = "degraded"  # Graceful local fallback active

    search_status = "healthy" if settings.SERPAPI_API_KEY else "degraded"
    voice_status = "healthy" if settings.ELEVENLABS_API_KEY else "degraded"

    overall_status = "healthy"
    if db_status == "unavailable":
        overall_status = "unavailable"
    elif "degraded" in [ai_status, search_status, voice_status]:
        overall_status = "degraded"

    http_code = 200 if overall_status != "unavailable" else status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=http_code,
        content={
            "status": overall_status,
            "version": "1.0.0",
            "environment": settings.ENVIRONMENT,
            "components": {
                "database": db_status,
                "ai": ai_status,
                "search": search_status,
                "voice": voice_status,
            },
        },
    )


@app.get("/health/database", tags=["Health"])
@app.get("/health/db", tags=["Health"])
def db_health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "service": "database", "message": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unavailable", "service": "database", "message": "connection failed"},
        )


@app.get("/health/ai", tags=["Health"])
async def ai_health_check():
    if settings.effective_llm_api_key:
        return {"status": "healthy", "service": "ai", "mode": "cloud_llm_configured"}
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{settings.effective_llm_base_url.rstrip('/')}/v1/models")
            if resp.status_code == 200:
                return {"status": "healthy", "service": "ai", "mode": "sglang_connected"}
    except Exception:
        pass
    return {"status": "degraded", "service": "ai", "mode": "local_fallback_active"}


@app.get("/health/search", tags=["Health"])
def search_health_check():
    if settings.SERPAPI_API_KEY:
        return {"status": "healthy", "service": "search", "mode": "serpapi_configured"}
    return {"status": "degraded", "service": "search", "mode": "local_fallback_active"}


@app.get("/health/voice", tags=["Health"])
def voice_health_check():
    if settings.ELEVENLABS_API_KEY:
        return {"status": "healthy", "service": "voice", "mode": "elevenlabs_configured"}
    return {"status": "degraded", "service": "voice", "mode": "local_synthesis_fallback_active"}


# Mount API V1 routers
v1_prefix = settings.API_V1_STR
app.include_router(auth.router, prefix=v1_prefix)
app.include_router(users.router, prefix=v1_prefix)
app.include_router(communities.router, prefix=v1_prefix)
app.include_router(locations.router, prefix=v1_prefix)
app.include_router(people.router, prefix=v1_prefix)
app.include_router(services.router, prefix=v1_prefix)
app.include_router(procedures.router, prefix=v1_prefix)
app.include_router(documents.router, prefix=v1_prefix)
app.include_router(announcements.router, prefix=v1_prefix)
app.include_router(admin.router, prefix=v1_prefix)
app.include_router(chat.router, prefix=v1_prefix)
app.include_router(navigation.router, prefix=v1_prefix)
app.include_router(voice.router, prefix=v1_prefix)
app.include_router(search.router, prefix=v1_prefix)
