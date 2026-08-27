FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# curl is used by the docker-compose healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Where the SQLite file lives inside the container. Override with DATABASE_URL
# if you point the DB elsewhere (e.g. Postgres). The compose file mounts a
# named volume here so the DB survives `docker compose down`.
ENV DATABASE_URL=sqlite:////data/magic_sort.db

EXPOSE 8000

# init_db() in app/main.py runs `alembic upgrade head` on startup, so a fresh
# volume gets a migrated DB with no extra step.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
