from datetime import datetime
from uuid import UUID
from typing import Literal
from pydantic import BaseModel, ConfigDict, field_validator


class TimeEntryCreate(BaseModel):
    label: str = ""
    hours: int = 0
    minutes: int = 0
    seconds: int = 0
    operation: Literal["add", "subtract"] = "add"

    @field_validator("hours")
    @classmethod
    def validate_hours(cls, v: int) -> int:
        if v < 0:
            raise ValueError("hours must be >= 0")
        return v

    @field_validator("minutes", "seconds")
    @classmethod
    def validate_minsec(cls, v: int) -> int:
        if v < 0 or v > 59:
            raise ValueError("must be between 0 and 59")
        return v


class TimeEntryUpdate(BaseModel):
    label: str | None = None
    hours: int | None = None
    minutes: int | None = None
    seconds: int | None = None
    operation: Literal["add", "subtract"] | None = None


class TimeEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    session_id: UUID
    label: str
    hours: int
    minutes: int
    seconds: int
    operation: str
    created_at: datetime


class SessionCreate(BaseModel):
    name: str


class SessionTotal(BaseModel):
    total_seconds: int
    is_negative: bool
    hours: int
    minutes: int
    seconds: int
    formatted: str


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    created_at: datetime
    updated_at: datetime
    entry_count: int
    total: SessionTotal


class SessionDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    created_at: datetime
    updated_at: datetime
    entries: list[TimeEntryResponse]
    total: SessionTotal


class CalculateRequest(BaseModel):
    entries: list[TimeEntryCreate]


class CalculateResponse(BaseModel):
    total: SessionTotal
