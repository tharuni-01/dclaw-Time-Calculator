import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_session(client: AsyncClient):
    response = await client.post("/api/v1/sessions", json={"name": "Week 1"})
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Week 1"
    assert data["entries"] == []
    assert data["total"]["formatted"] == "00:00:00"


@pytest.mark.asyncio
async def test_list_sessions(client: AsyncClient):
    await client.post("/api/v1/sessions", json={"name": "Session A"})
    await client.post("/api/v1/sessions", json={"name": "Session B"})
    response = await client.get("/api/v1/sessions")
    assert response.status_code == 200
    assert len(response.json()) == 2


@pytest.mark.asyncio
async def test_add_entry_and_total(client: AsyncClient):
    create = await client.post("/api/v1/sessions", json={"name": "Payroll"})
    session_id = create.json()["id"]

    await client.post(
        f"/api/v1/sessions/{session_id}/entries",
        json={"label": "Monday", "hours": 8, "minutes": 30, "seconds": 0, "operation": "add"},
    )
    await client.post(
        f"/api/v1/sessions/{session_id}/entries",
        json={"label": "Lunch", "hours": 0, "minutes": 30, "seconds": 0, "operation": "subtract"},
    )

    response = await client.get(f"/api/v1/sessions/{session_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data["entries"]) == 2
    assert data["total"]["formatted"] == "08:00:00"
    assert data["total"]["total_seconds"] == 8 * 3600


@pytest.mark.asyncio
async def test_delete_entry(client: AsyncClient):
    create = await client.post("/api/v1/sessions", json={"name": "Test"})
    session_id = create.json()["id"]
    entry = await client.post(
        f"/api/v1/sessions/{session_id}/entries",
        json={"label": "Task", "hours": 2, "minutes": 0, "seconds": 0, "operation": "add"},
    )
    entry_id = entry.json()["id"]
    del_resp = await client.delete(f"/api/v1/sessions/{session_id}/entries/{entry_id}")
    assert del_resp.status_code == 204
    detail = await client.get(f"/api/v1/sessions/{session_id}")
    assert detail.json()["entries"] == []


@pytest.mark.asyncio
async def test_delete_session(client: AsyncClient):
    create = await client.post("/api/v1/sessions", json={"name": "To Delete"})
    session_id = create.json()["id"]
    del_resp = await client.delete(f"/api/v1/sessions/{session_id}")
    assert del_resp.status_code == 204
    get_resp = await client.get(f"/api/v1/sessions/{session_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_stateless_calculate(client: AsyncClient):
    response = await client.post(
        "/api/v1/sessions/calculate",
        json={
            "entries": [
                {"label": "A", "hours": 3, "minutes": 45, "seconds": 0, "operation": "add"},
                {"label": "B", "hours": 1, "minutes": 15, "seconds": 0, "operation": "subtract"},
            ]
        },
    )
    assert response.status_code == 200
    assert response.json()["total"]["formatted"] == "02:30:00"


@pytest.mark.asyncio
async def test_negative_total(client: AsyncClient):
    response = await client.post(
        "/api/v1/sessions/calculate",
        json={
            "entries": [
                {"hours": 1, "minutes": 0, "seconds": 0, "operation": "subtract"},
                {"hours": 0, "minutes": 30, "seconds": 0, "operation": "add"},
            ]
        },
    )
    assert response.status_code == 200
    total = response.json()["total"]
    assert total["is_negative"] is True
    assert total["formatted"] == "-00:30:00"
