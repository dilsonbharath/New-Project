import os
from functools import lru_cache

from pydantic_settings import BaseSettings


def _default_cors_origins() -> list[str]:
    return [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
    ]


def _parse_cors_origins(value: str | list[str] | None) -> list[str]:
    if isinstance(value, list):
        return value
    if not value:
        return _default_cors_origins()
    return [origin.strip() for origin in value.split(",") if origin.strip()]


def _normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql://", 1)
    return database_url

class Settings(BaseSettings):
    SECRET_KEY: str = "your_default_secret_key_change_this"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str = _normalize_database_url(
        os.getenv("DATABASE_URL", "sqlite:///./habits.db")
    )
    CORS_ORIGINS: list[str] = _parse_cors_origins(os.getenv("CORS_ORIGINS"))

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()
