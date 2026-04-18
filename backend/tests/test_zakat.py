import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_health(client):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


async def test_zakat_calculate_requires_auth(client):
    """Calculate endpoint requires Authorization header."""
    resp = await client.post("/api/zakat/calculate")
    assert resp.status_code == 422


async def test_assets_requires_auth(client):
    """Assets endpoint requires Authorization header."""
    resp = await client.get("/api/assets")
    assert resp.status_code == 422
