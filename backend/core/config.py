from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Auth JWT
    SECRET_KEY: str = "changeme-in-production-use-a-64-char-random-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Admin inicial
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin123"

    # DB
    DATABASE_URL: str = "sqlite:///./test.db"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
