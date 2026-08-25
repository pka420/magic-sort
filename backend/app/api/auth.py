"""
Accounts: register and sign in by email/password, or by Google.

Unverified local users are let in — the game is playable the moment an account
exists — but the caller can see `is_verified` and withhold the leaderboard
until the address is confirmed. Google users arrive verified.
"""

import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import AUTH_PROVIDER_GOOGLE, AUTH_PROVIDER_LOCAL, User
from ..schemas import (
    ForgotPasswordRequest,
    LoginRequest,
    Message,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserOut,
    UsernameRequest,
)
from ..security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from .email_utils import send_email

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


def _to_user(user: User) -> UserOut:
    return UserOut.model_validate(user)


def _utcnow() -> datetime:
    """Now, as a naive UTC datetime — what SQLite hands back from a DateTime."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """The player behind the bearer token, or a 401."""
    credentials_error = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if token is None:
        raise credentials_error

    user_id = decode_access_token(token)
    if user_id is None:
        raise credentials_error

    user = db.get(User, user_id)
    if user is None:
        raise credentials_error
    return user


@router.post("/register", response_model=Message)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.username == request.username)):
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.scalar(select(User).where(User.email == request.email)):
        raise HTTPException(status_code=400, detail="Email already registered")

    token = secrets.token_urlsafe(32)
    user = User(
        username=request.username,
        email=request.email,
        password_hash=hash_password(request.password),
        auth_provider=AUTH_PROVIDER_LOCAL,
        is_verified=False,
        email_token=token,
    )
    db.add(user)
    db.commit()

    send_email(request.email, token, purpose="verify")
    return Message(message=f"Account for '{request.username}' created")


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == request.email))
    if user is None or user.password_hash is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return TokenResponse(access_token=create_access_token(user.id), user=_to_user(user))


@router.get("/verify-email", response_model=Message)
def verify_email(token: str, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email_token == token))
    if user is None:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    user.is_verified = True
    user.email_token = None
    db.commit()
    return Message(message="Email verified")


@router.post("/resend-verification", response_model=Message)
def resend_verification(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sends the confirmation email again, for a player who lost the first one."""
    if user.is_verified:
        return Message(message="Email already verified")

    if not user.email:
        raise HTTPException(status_code=400, detail="No email address on this account")

    user.email_token = secrets.token_urlsafe(32)
    db.commit()
    send_email(user.email, user.email_token, purpose="verify")
    return Message(message="Verification email sent")


@router.post("/forgot-password", response_model=Message)
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == request.email))

    # The same answer either way, so the endpoint does not reveal whether an
    # address is registered.
    if user is not None and user.password_hash is not None:
        user.reset_token = secrets.token_urlsafe(32)
        user.reset_token_expiry = _utcnow() + timedelta(minutes=15)
        db.commit()
        send_email(user.email or request.email, user.reset_token, purpose="reset")

    return Message(message="If that email exists, a reset link has been sent")


@router.post("/reset-password", response_model=Message)
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.reset_token == request.token))
    if user is None:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    if user.reset_token_expiry is None or user.reset_token_expiry < _utcnow():
        raise HTTPException(status_code=400, detail="Reset token has expired")

    user.password_hash = hash_password(request.new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    db.commit()
    return Message(message="Password reset")


@router.get("/google/authorize")
def google_authorize():
    """Sends the player off to Google's consent screen."""
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "prompt": "select_account",
    }
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{urlencode(params)}")


@router.get("/google/callback")
def google_callback(code: str, db: Session = Depends(get_db)):
    """Completes the round trip: code becomes a player, player gets a token."""
    profile = _google_profile(code)
    if profile is None:
        raise HTTPException(status_code=400, detail="Google sign-in failed")

    google_id = profile.get("sub")
    email = profile.get("email")

    user = db.scalar(select(User).where(User.google_id == google_id)) if google_id else None
    if user is None and email:
        # A player may have signed up by email first, then by Google.
        user = db.scalar(select(User).where(User.email == email))

    if user is None:
        user = User(
            email=email,
            google_id=google_id,
            auth_provider=AUTH_PROVIDER_GOOGLE,
            is_verified=True,
        )
        db.add(user)
    else:
        user.google_id = google_id
        user.auth_provider = AUTH_PROVIDER_GOOGLE
        user.is_verified = True

    db.commit()
    db.refresh(user)

    # The token rides in the URL fragment so it never reaches a log: fragments
    # stay in the browser. The game reads it and stores it away.
    return RedirectResponse(f"{settings.frontend_url}#access_token={create_access_token(user.id)}")


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return _to_user(user)


@router.post("/username", response_model=UserOut)
def set_username(
    request: UsernameRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    taken = db.scalar(
        select(User).where(User.username == request.username, User.id != user.id)
    )
    if taken is not None:
        raise HTTPException(status_code=400, detail="Username already taken")

    user.username = request.username
    db.commit()
    db.refresh(user)
    return _to_user(user)


def _google_profile(code: str) -> dict | None:
    """Exchanges an authorization code for the Google account behind it."""

    token = httpx.post(
        GOOGLE_TOKEN_URL,
        data={
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": settings.google_redirect_uri,
            "grant_type": "authorization_code",
        },
    ).json()
    access_token = token.get("access_token")
    if not access_token:
        return None

    profile = httpx.get(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
    ).json()
    if "sub" not in profile:
        return None
    return profile
