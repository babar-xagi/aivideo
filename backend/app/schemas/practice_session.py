from datetime import datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PracticeType(StrEnum):
    talk_about_your_day = "talk_about_your_day"
    explain_something = "explain_something"
    tell_a_story = "tell_a_story"
    short_presentation = "short_presentation"
    job_interview = "job_interview"
    ielts = "ielts"
    free_speaking = "free_speaking"


class SessionCreate(BaseModel):
    topic: str = Field(min_length=1, max_length=200)
    practice_type: PracticeType

    @field_validator("topic")
    @classmethod
    def clean_topic(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Topic cannot be blank")
        return value


class SessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    topic: str
    practice_type: PracticeType
    status: str
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    duration_seconds: int | None
    recording_object_key: str | None
    vision_enabled: bool
