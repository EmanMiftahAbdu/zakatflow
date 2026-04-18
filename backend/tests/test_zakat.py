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


async def test_zakat_calculation_above_nisab(client):
    resp = await client.post(
        "/api/zakat/calculate",
        json={"cash": 10000, "gold_value": 0, "debts": 0},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_above_nisab"] is True
    assert data["zakat_due"] == 250.0


async def test_zakat_calculation_below_nisab(client):
    resp = await client.post(
        "/api/zakat/calculate",
        json={"cash": 1000},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_above_nisab"] is False
    assert data["zakat_due"] == 0
