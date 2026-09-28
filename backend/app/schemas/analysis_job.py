from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MockReport(BaseModel):
    mode: Literal["mock"]
    title: str
    summary: str
    topic: str
    practice_suggestions: list[str]
    generated_at: datetime
    transcription_available: bool = False


class TranscriptSegment(BaseModel):
    start: float
    end: float
    text: str


class TranscriptWord(BaseModel):
    start: float
    end: float
    text: str


class Transcript(BaseModel):
    language: Literal["en"]
    model: str
    duration_seconds: float
    text: str
    segments: list[TranscriptSegment]
    words: list[TranscriptWord] | None = None


class TimedWord(BaseModel):
    word: str
    start: float


class Pause(BaseModel):
    start: float
    end: float
    duration: float


class SpeechMetrics(BaseModel):
    total_words: int
    speech_span_seconds: float
    words_per_minute: float | None
    pause_count: int
    average_pause_seconds: float | None
    long_pause_count: int
    filler_count: int
    filler_frequency_per_100_words: float | None
    repetition_count: int
    fillers: list[TimedWord]
    pauses: list[Pause]
    repetitions: list[TimedWord]


class AnalysisJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    session_id: UUID
    status: Literal[
        "queued",
        "transcribing",
        "analyzing_fluency",
        "analyzing_english",
        "analyzing_presentation",
        "creating_feedback",
        "completed",
        "failed",
    ]
    created_at: datetime
    updated_at: datetime
    report: MockReport | None
    transcript: Transcript | None
    metrics: SpeechMetrics | None
    error_message: str | None
