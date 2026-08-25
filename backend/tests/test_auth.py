from fastapi.testclient import TestClient
from sqlalchemy import select

import app.api.auth as auth_module
from app.database import SessionLocal
from app.models import User


def user_by_email(email: str) -> User | None:
    with SessionLocal() as db:
        return db.scalar(select(User).where(User.email == email))


def register(client: TestClient, username="alice", email="alice@example.com", password="password123"):
    return client.post(
        "/api/auth/register",
        json={"username": username, "email": email, "password": password},
    )


def login(client: TestClient, email="alice@example.com", password="password123"):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def test_register_and_login(client):
    assert register(client).status_code == 200

    response = login(client)
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["username"] == "alice"
    assert body["user"]["is_verified"] is False


def test_register_rejects_taken_username(client):
    register(client)
    response = register(client, email="bob@example.com")
    assert response.status_code == 400
    assert response.json()["detail"] == "Username already taken"


def test_register_rejects_taken_email(client):
    register(client)
    response = register(client, username="bob")
    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"


def test_login_rejects_wrong_password(client):
    register(client)
    response = login(client, password="wrong-password")
    assert response.status_code == 401


def test_login_rejects_unknown_email(client):
    response = login(client, email="nobody@example.com")
    assert response.status_code == 401


def test_login_rejects_short_password(client):
    response = register(client, password="short")
    assert response.status_code == 422


def test_unverified_user_can_still_login(client):
    register(client)
    assert login(client).status_code == 200


def test_verify_email_confirms_the_account(client):
    register(client)
    token = user_by_email("alice@example.com").email_token

    response = client.get("/api/auth/verify-email", params={"token": token})
    assert response.status_code == 200

    body = login(client).json()
    assert body["user"]["is_verified"] is True


def test_verify_email_rejects_unknown_token(client):
    response = client.get("/api/auth/verify-email", params={"token": "nope"})
    assert response.status_code == 400


def test_resend_verification_mails_a_fresh_token(client, monkeypatch):
    register(client)
    token = login(client).json()["access_token"]
    original = user_by_email("alice@example.com").email_token

    sent = []
    monkeypatch.setattr(auth_module, "send_email", lambda to, tok, purpose: sent.append((to, tok, purpose)))

    response = client.post(
        "/api/auth/resend-verification",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200

    refreshed = user_by_email("alice@example.com")
    assert refreshed.email_token != original
    assert sent == [("alice@example.com", refreshed.email_token, "verify")]


def test_resend_verification_requires_a_token(client):
    register(client)
    response = client.post("/api/auth/resend-verification")
    assert response.status_code == 401


def test_resend_verification_says_when_already_verified(client):
    register(client)
    token = login(client).json()["access_token"]
    client.get(
        "/api/auth/verify-email",
        params={"token": user_by_email("alice@example.com").email_token},
    )

    response = client.post(
        "/api/auth/resend-verification",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Email already verified"


def test_me_requires_a_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_returns_the_signed_in_player(client):
    register(client)
    token = login(client).json()["access_token"]

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["username"] == "alice"


def test_forgot_and_reset_password(client):
    register(client)

    forgot = client.post(
        "/api/auth/forgot-password", json={"email": "alice@example.com"}
    )
    assert forgot.status_code == 200

    reset_token = user_by_email("alice@example.com").reset_token
    reset = client.post(
        "/api/auth/reset-password",
        json={"token": reset_token, "new_password": "new-password-1"},
    )
    assert reset.status_code == 200

    assert login(client, password="new-password-1").status_code == 200
    assert login(client, password="password123").status_code == 401


def test_google_callback_creates_a_verified_player(client, monkeypatch):
    monkeypatch.setattr(
        auth_module,
        "_google_profile",
        lambda code: {"sub": "g-1", "email": "alice@gmail.com"},
    )

    response = client.get("/api/auth/google/callback", params={"code": "c"}, follow_redirects=False)
    assert response.status_code == 307
    assert "access_token=" in response.headers["location"]

    player = user_by_email("alice@gmail.com")
    assert player is not None
    assert player.auth_provider == "google"
    assert player.is_verified is True
    assert player.username is None


def test_google_signin_links_an_existing_email_account(client, monkeypatch):
    register(client, email="alice@example.com")
    monkeypatch.setattr(
        auth_module,
        "_google_profile",
        lambda code: {"sub": "g-1", "email": "alice@example.com"},
    )

    client.get("/api/auth/google/callback", params={"code": "c"}, follow_redirects=False)

    player = user_by_email("alice@example.com")
    assert player.auth_provider == "google"
    assert player.is_verified is True


def test_username_can_be_set_after_google_signin(client, monkeypatch):
    monkeypatch.setattr(
        auth_module,
        "_google_profile",
        lambda code: {"sub": "g-1", "email": "alice@gmail.com"},
    )
    location = client.get(
        "/api/auth/google/callback", params={"code": "c"}, follow_redirects=False
    ).headers["location"]
    token = location.split("access_token=")[1]

    response = client.post(
        "/api/auth/username",
        json={"username": "alice"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["username"] == "alice"


def test_username_rejects_a_taken_name(client, monkeypatch):
    register(client, username="alice")
    monkeypatch.setattr(
        auth_module,
        "_google_profile",
        lambda code: {"sub": "g-2", "email": "bob@gmail.com"},
    )

    location = client.get(
        "/api/auth/google/callback", params={"code": "c"}, follow_redirects=False
    ).headers["location"]
    token = location.split("access_token=")[1]

    response = client.post(
        "/api/auth/username",
        json={"username": "alice"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 400
