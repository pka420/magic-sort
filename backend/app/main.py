"""The FastAPI application: routers, CORS and the SQLite tables on startup."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401  (register the tables before they are created)
from .api import auth, leaderboard
from .config import settings
from .database import init_db


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Magic Sort API", lifespan=lifespan)

# The game talks to the API through a same-domain /api proxy, so cross-origin
# is normally not needed. When it is (a second frontend origin, say), list the
# origins in CORS_ORIGINS and they are allowed here.
if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(auth.router, prefix="/api")
app.include_router(leaderboard.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
