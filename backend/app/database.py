"""The one database boundary: a SQLite file behind SQLAlchemy."""

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

# SQLite needs this one allowance: FastAPI hands each request its own thread,
# and the sqlite3 module refuses a connection opened in another thread by
# default. SQLAlchemy still pools connections for us; this only lifts that
# single check.
connect_args = (
    {"check_same_thread": False}
    if settings.database_url.startswith("sqlite")
    else {}
)

engine = create_engine(settings.database_url, connect_args=connect_args)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    """A request-scoped session, handed out by FastAPI's dependency injection."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Creates the tables that do not exist yet. Idempotent."""
    Base.metadata.create_all(bind=engine)
