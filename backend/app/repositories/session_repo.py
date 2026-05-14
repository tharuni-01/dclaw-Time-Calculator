from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.time_calculator import CalculationSession, TimeEntry
from app.repositories.base_repo import BaseRepository


class SessionRepository(BaseRepository[CalculationSession]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, CalculationSession)

    async def get_with_entries(self, session_id: UUID) -> CalculationSession | None:
        result = await self.db.execute(
            select(CalculationSession).where(CalculationSession.id == session_id)
        )
        return result.scalar_one_or_none()


class EntryRepository(BaseRepository[TimeEntry]):
    def __init__(self, db: AsyncSession):
        super().__init__(db, TimeEntry)

    async def get_entry(self, session_id: UUID, entry_id: UUID) -> TimeEntry | None:
        result = await self.db.execute(
            select(TimeEntry).where(
                TimeEntry.id == entry_id,
                TimeEntry.session_id == session_id,
            )
        )
        return result.scalar_one_or_none()
