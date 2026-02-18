from pydantic_settings import BaseSettings
from functools import lru_cache
import os

class Settings(BaseSettings):
    SECRET_KEY: str = "your_default_secret_key_change_this"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./habits.db")
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings()
