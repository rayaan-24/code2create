from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy import text

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.database.session import SessionLocal, engine
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
)

setup_logging()

# Automatically create tables if not existing (e.g. SQLite / initial dev)
Base.metadata.create_all(bind=engine)

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


# Health checks
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "environment": settings.ENVIRONMENT}


@app.get("/health/db", tags=["Health"])
def db_health_check():
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "error", "database": str(e)},
        )
    finally:
        db.close()


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
