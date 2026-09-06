from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "NEXORA Intelligent Community Platform API"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Database configuration
    DATABASE_URL: str = "sqlite:///./nexora.db"

    # JWT Authentication
    JWT_SECRET_KEY: str = "nexora_super_secret_jwt_signing_key_change_in_production_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS Origins (Frontend)
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ]

    # AI / SGLang / RAG Configuration (Phase 3)
    SGLANG_BASE_URL: str = "http://localhost:30000"
    SGLANG_MODEL: str = "meta-llama/Llama-3.1-8B-Instruct"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    VECTOR_SEARCH_TOP_K: int = 10
    RERANK_TOP_K: int = 5
    MAX_CONTEXT_TOKENS: int = 4096
    MAX_TOOL_CALLS: int = 5
    AI_REQUEST_TIMEOUT: int = 30
    RATE_LIMIT_PER_MINUTE: int = 60

    # Phase 4: Voice & Web Search Configuration
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"
    ELEVENLABS_MODEL_ID: str = "eleven_multilingual_v2"
    VOICE_REQUEST_TIMEOUT: int = 15

    SERPAPI_API_KEY: str = ""
    SERPAPI_ENGINE: str = "google"
    SEARCH_REQUEST_TIMEOUT: int = 10

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
