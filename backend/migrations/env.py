"""Alembic's environment: the models to diff against and the URL to reach.

Both come from `app`, not from `alembic.ini`, so `models.py` and `config.py`
stay the single source of truth. `alembic.ini` only carries the migration
script location and logging.
"""

import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

# The `app` package lives one directory up from this file; put it on the path
# before importing, so `alembic` works from anywhere.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import models  # noqa: E402, F401  (registers the tables on Base.metadata)
from app.config import settings  # noqa: E402
from app.database import Base  # noqa: E402

config = context.config

# Logging is configured from the ini only when the CLI drives this script.
# The app calls it programmatically without an ini, where configuring logging
# again would silence uvicorn's own.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

config.set_main_option("sqlalchemy.url", settings.database_url)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Emit SQL to stdout rather than touching a database."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run against a real connection."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # SQLite cannot ALTER in place; batch mode rebuilds tables so a
            # column change migrates the same way it would on Postgres.
            render_as_batch=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
