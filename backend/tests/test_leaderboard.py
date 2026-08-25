from fastapi.testclient import TestClient
from sqlalchemy import select

from app.database import SessionLocal
from app.models import Score, User


def add_player(username: str, total: int, verified: bool = True) -> None:
    with SessionLocal() as db:
        user = User(username=username, auth_provider="local", is_verified=verified)
        db.add(user)
        db.commit()
        db.refresh(user)
        db.add(Score(user_id=user.id, total=total))
        db.commit()


def register_and_login(
    client: TestClient,
    username="alice",
    email="alice@example.com",
    password="password123",
) -> str:
    client.post(
        "/api/auth/register",
        json={"username": username, "email": email, "password": password},
    )
    return client.post(
        "/api/auth/login", json={"email": email, "password": password}
    ).json()["access_token"]


def score_for(username: str) -> int:
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.username == username))
        return db.get(Score, user.id).total


def test_leaderboard_is_empty_to_begin_with(client):
    assert client.get("/api/leaderboard").json() == []


def test_leaderboard_ranks_players_by_best_total(client):
    add_player("alice", 5000)
    add_player("bob", 9000)
    add_player("carol", 7000)

    entries = client.get("/api/leaderboard").json()

    assert [e["username"] for e in entries] == ["bob", "carol", "alice"]
    assert [e["rank"] for e in entries] == [1, 2, 3]
    assert entries[0]["total"] == 9000


def test_leaderboard_hides_unverified_players(client):
    add_player("alice", 5000, verified=False)
    add_player("bob", 9000)

    entries = client.get("/api/leaderboard").json()

    assert [e["username"] for e in entries] == ["bob"]


def test_submit_score_requires_a_token(client):
    assert client.post("/api/scores", json={"total": 100}).status_code == 401


def test_submit_score_keeps_the_best(client):
    token = register_and_login(client)
    headers = {"Authorization": f"Bearer {token}"}

    client.post("/api/scores", json={"total": 300}, headers=headers)
    client.post("/api/scores", json={"total": 900}, headers=headers)
    client.post("/api/scores", json={"total": 500}, headers=headers)

    assert score_for("alice") == 900


def test_an_unverified_score_stays_hidden(client):
    token = register_and_login(client)
    client.post(
        "/api/scores",
        json={"total": 900},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert client.get("/api/leaderboard").json() == []


def test_a_verified_score_appears(client):
    token = register_and_login(client)
    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == "alice@example.com"))
        client.get("/api/auth/verify-email", params={"token": user.email_token})

    client.post(
        "/api/scores",
        json={"total": 900},
        headers={"Authorization": f"Bearer {token}"},
    )

    entries = client.get("/api/leaderboard").json()
    assert entries == [{"rank": 1, "username": "alice", "total": 900}]
