"""
Environment configuration, read once at import.

The values come from a `.env` file next to this package (or the process
environment). Defaults keep a local `uvicorn app.main:app` runnable with no
`.env` at all, at the cost of a well-known secret — which `.env.example`
warns to replace before anything reaches a real server.
"""

import os

from dotenv import load_dotenv

load_dotenv()


def _int(name: str, default: int) -> int:
    raw = os.getenv(name)
    return int(raw) if raw else default


def _bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    return raw.lower() == "true" if raw else default


def _list(name: str) -> list[str]:
    raw = os.getenv(name)
    return [item.strip() for item in raw.split(",") if item.strip()] if raw else []


class Settings:
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./magic_sort.db")
    secret_key: str = os.getenv("SECRET_KEY", "dev-only-secret-change-me")
    access_token_expire_minutes: int = _int("ACCESS_TOKEN_EXPIRE_MINUTES", 10080)

    google_client_id: str = os.getenv("GOOGLE_CLIENT_ID", "")
    google_client_secret: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    google_redirect_uri: str = os.getenv("GOOGLE_REDIRECT_URI", "")
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Cross-origin frontends allowed to call the API directly, bypassing the
    # /api proxy. Empty by default: the same-domain proxy makes CORS moot.
    cors_origins: list[str] = _list("CORS_ORIGINS")

    email_enabled: bool = _bool("EMAIL_ENABLED", True)
    smtp_server: str = os.getenv("SMTP_SERVER", "")
    smtp_port: int = _int("SMTP_PORT", 587)
    smtp_user: str = os.getenv("SMTP_USER", "")
    smtp_password: str = os.getenv("SMTP_PASSWORD", "")
    smtp_from: str = os.getenv("SMTP_FROM", "noreply@example.com")


settings = Settings()
