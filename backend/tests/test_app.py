from fastapi.testclient import TestClient


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_google_authorize_is_turned_off_when_unconfigured(client):
    # The test environment leaves GOOGLE_CLIENT_ID blank, so the endpoint has
    # nothing to redirect to and says so rather than sending the player off.
    assert client.get("/api/auth/google/authorize").status_code == 503
