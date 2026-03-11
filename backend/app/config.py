import json
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
        return [origin.strip() for origin in value if origin.strip()]
    if not value:
        return _default_cors_origins()
    raw = value.strip()
    if raw.startswith("["):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [str(origin).strip() for origin in parsed if str(origin).strip()]
        except json.JSONDecodeError:
            pass
    parsed_csv = [origin.strip() for origin in raw.split(",") if origin.strip()]
    return parsed_csv or _default_cors_origins()


def _normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql://", 1)
    return database_url

class Settings(BaseSettings):
    SECRET_KEY: str = "your_default_secret_key_change_this"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./habits.db")
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        ",".join(_default_cors_origins())
    )

    class Config:
        env_file = ".env"

    @property
    def normalized_database_url(self) -> str:
        return _normalize_database_url(self.DATABASE_URL)

    @property
    def cors_origins_list(self) -> list[str]:
        return _parse_cors_origins(self.CORS_ORIGINS)


@lru_cache()
def get_settings():
    return Settings()
