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

    # Future integration placeholders (Phase 3 & 4)
    SGLANG_BASE_URL: str = "http://localhost:30000"
    ELEVENLABS_API_KEY: str = ""
    SERPAPI_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
