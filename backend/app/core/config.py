import os
from pathlib import Path
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_ROOT_DIR = _BACKEND_DIR.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "NEXORA Intelligent Community Platform API"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"

    # Database configuration
    DATABASE_URL: str = "sqlite:///./nexora.db"

    # Document Upload & Storage
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_BYTES: int = 25 * 1024 * 1024  # 25 MB max per file

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

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # AI / SGLang / RAG Configuration (Phase 3 & Phase 6)
    SGLANG_BASE_URL: str = "http://localhost:30000"
    SGLANG_MODEL: str = "meta-llama/Llama-3.1-8B-Instruct"
    SGLANG_TEMPERATURE: float = 0.1
    SGLANG_MAX_TOKENS: int = 1024
    SGLANG_TOP_P: float = 0.95
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    VECTOR_SEARCH_TOP_K: int = 10
    RERANK_TOP_K: int = 5
    MAX_CONTEXT_CHUNKS: int = 5
    MAX_CONTEXT_TOKENS: int = 4096
    RAG_MIN_RELEVANCE_SCORE: float = 0.35
    MAX_TOOL_CALLS: int = 5
    AI_REQUEST_TIMEOUT: int = 35
    RATE_LIMIT_PER_MINUTE: int = 60

    # Optional AI LLM Provider Keys & Endpoints (Groq, OpenAI, SGLang, OpenRouter, etc.)
    LLM_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    SGLANG_API_KEY: str = ""
    LLM_PROVIDER: str = "auto"

    @property
    def effective_llm_api_key(self) -> str:
        return (
            self.LLM_API_KEY
            or self.GROQ_API_KEY
            or self.OPENAI_API_KEY
            or self.SGLANG_API_KEY
        ).strip()

    @property
    def effective_llm_base_url(self) -> str:
        # If GROQ_API_KEY is provided and SGLANG_BASE_URL is localhost default, switch to Groq endpoint
        if self.GROQ_API_KEY and ("localhost:30000" in self.SGLANG_BASE_URL or "127.0.0.1:30000" in self.SGLANG_BASE_URL):
            return "https://api.groq.com/openai/v1"
        # If OPENAI_API_KEY is provided and SGLANG_BASE_URL is localhost default, switch to OpenAI endpoint
        if self.OPENAI_API_KEY and ("localhost:30000" in self.SGLANG_BASE_URL or "127.0.0.1:30000" in self.SGLANG_BASE_URL):
            return "https://api.openai.com/v1"
        return self.SGLANG_BASE_URL.rstrip("/")

    @property
    def effective_llm_model(self) -> str:
        if self.GROQ_API_KEY and self.SGLANG_MODEL == "meta-llama/Llama-3.1-8B-Instruct" and "groq.com" in self.effective_llm_base_url:
            return "openai/gpt-oss-20b"
        if self.OPENAI_API_KEY and self.SGLANG_MODEL == "meta-llama/Llama-3.1-8B-Instruct" and "openai.com" in self.effective_llm_base_url:
            return "gpt-4o-mini"
        return self.SGLANG_MODEL

    # Phase 4: Voice & Web Search Configuration
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"
    ELEVENLABS_MODEL_ID: str = "eleven_multilingual_v2"
    VOICE_REQUEST_TIMEOUT: int = 15

    SERPAPI_API_KEY: str = ""
    SERPAPI_ENGINE: str = "google"
    SEARCH_REQUEST_TIMEOUT: int = 10

    model_config = SettingsConfigDict(
        env_file=(
            str(_BACKEND_DIR / ".env"),
            str(_ROOT_DIR / ".env"),
            ".env",
        ),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
