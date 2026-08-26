"""SQLAlchemy models. For now, just the one: a player account."""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base

# Which sign-in route created the account. Google users carry a google_id and
# arrive pre-verified; local users set a password and verify their email.
AUTH_PROVIDER_LOCAL = "local"
AUTH_PROVIDER_GOOGLE = "google"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    # Chosen by the player. Null for a Google user who has not picked one yet,
    # so it can stay unique without inventing a placeholder to collide with.
    username = Column(String(50), unique=True, nullable=True)

    # Null for a Google user whose account Google refuses to share an address
    # for. Unique still applies; SQLite treats the nulls as distinct.
    email = Column(String(255), unique=True, nullable=True, index=True)

    # Only local users have one. Google users sign in with Google, not a
    # password, so there is nothing to store.
    password_hash = Column(String(255), nullable=True)

    auth_provider = Column(String(16), nullable=False, default=AUTH_PROVIDER_LOCAL)

    google_id = Column(String(255), unique=True, nullable=True)

    # Unverified local users may play and keep a run, but their scores are
    # withheld from the leaderboard until the address is confirmed.
    is_verified = Column(Boolean, nullable=False, default=False)

    email_token = Column(String(64), nullable=True)
    reset_token = Column(String(64), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)

    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    scores = relationship("Score", back_populates="user", cascade="all, delete-orphan")


class Score(Base):
    """A player's best on one level — the number ranked on that level's board."""

    __tablename__ = "scores"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    level_id = Column(Integer, primary_key=True)
    total = Column(Integer, nullable=False, default=0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="scores")
