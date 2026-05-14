from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.time_calculator import CalculationSession, TimeEntry
from app.repositories.session_repo import SessionRepository, EntryRepository
from app.schemas.time_calculator import (
    SessionCreate, SessionResponse, SessionDetailResponse,
    TimeEntryCreate, TimeEntryUpdate, TimeEntryResponse,
    CalculateRequest, CalculateResponse,
)
from app.services.time_service import calculate_total

router = APIRouter()


def _to_session_response(session: CalculationSession) -> SessionResponse:
    return SessionResponse(
        id=session.id,
        name=session.name,
        created_at=session.created_at,
        updated_at=session.updated_at,
        entry_count=len(session.entries),
        total=calculate_total(session.entries),
    )


@router.post("/calculate", response_model=CalculateResponse)
async def calculate_stateless(body: CalculateRequest):
    return CalculateResponse(total=calculate_total(body.entries))


@router.get("", response_model=list[SessionResponse])
async def list_sessions(db: AsyncSession = Depends(get_db)):
    repo = SessionRepository(db)
    sessions, _ = await repo.list_all(limit=100)
    return [_to_session_response(s) for s in sessions]


@router.post("", response_model=SessionDetailResponse, status_code=201)
async def create_session(body: SessionCreate, db: AsyncSession = Depends(get_db)):
    session = CalculationSession(name=body.name)
    repo = SessionRepository(db)
    session = await repo.create(session)
    return SessionDetailResponse(
        id=session.id,
        name=session.name,
        created_at=session.created_at,
        updated_at=session.updated_at,
        entries=[],
        total=calculate_total([]),
    )


@router.get("/{session_id}", response_model=SessionDetailResponse)
async def get_session(session_id: UUID, db: AsyncSession = Depends(get_db)):
    session = await SessionRepository(db).get_with_entries(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionDetailResponse(
        id=session.id,
        name=session.name,
        created_at=session.created_at,
        updated_at=session.updated_at,
        entries=[TimeEntryResponse.model_validate(e) for e in session.entries],
        total=calculate_total(session.entries),
    )


@router.patch("/{session_id}", response_model=SessionDetailResponse)
async def rename_session(session_id: UUID, body: SessionCreate, db: AsyncSession = Depends(get_db)):
    repo = SessionRepository(db)
    session = await repo.get_with_entries(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.name = body.name
    await db.commit()
    await db.refresh(session)
    return SessionDetailResponse(
        id=session.id,
        name=session.name,
        created_at=session.created_at,
        updated_at=session.updated_at,
        entries=[TimeEntryResponse.model_validate(e) for e in session.entries],
        total=calculate_total(session.entries),
    )


@router.delete("/{session_id}", status_code=204)
async def delete_session(session_id: UUID, db: AsyncSession = Depends(get_db)):
    repo = SessionRepository(db)
    session = await repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await repo.delete(session)


@router.post("/{session_id}/entries", response_model=TimeEntryResponse, status_code=201)
async def add_entry(session_id: UUID, body: TimeEntryCreate, db: AsyncSession = Depends(get_db)):
    session = await SessionRepository(db).get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    entry = TimeEntry(
        session_id=session_id,
        label=body.label,
        hours=body.hours,
        minutes=body.minutes,
        seconds=body.seconds,
        operation=body.operation,
    )
    entry = await EntryRepository(db).create(entry)
    return TimeEntryResponse.model_validate(entry)


@router.put("/{session_id}/entries/{entry_id}", response_model=TimeEntryResponse)
async def update_entry(
    session_id: UUID,
    entry_id: UUID,
    body: TimeEntryUpdate,
    db: AsyncSession = Depends(get_db),
):
    repo = EntryRepository(db)
    entry = await repo.get_entry(session_id, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    if body.label is not None:
        entry.label = body.label
    if body.hours is not None:
        entry.hours = body.hours
    if body.minutes is not None:
        entry.minutes = body.minutes
    if body.seconds is not None:
        entry.seconds = body.seconds
    if body.operation is not None:
        entry.operation = body.operation
    await db.commit()
    await db.refresh(entry)
    return TimeEntryResponse.model_validate(entry)


@router.delete("/{session_id}/entries/{entry_id}", status_code=204)
async def delete_entry(
    session_id: UUID, entry_id: UUID, db: AsyncSession = Depends(get_db)
):
    repo = EntryRepository(db)
    entry = await repo.get_entry(session_id, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    await repo.delete(entry)
