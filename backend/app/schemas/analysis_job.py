from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


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


class GrammarIssueRead(BaseModel):
    timestamp_start: float
    timestamp_end: float
    original: str
    suggestion: str
    explanation: str
    category: Literal["verb_tense", "word_order", "agreement", "article", "other"]
    severity: Literal["low", "medium", "high"]


class ClaritySuggestionRead(BaseModel):
    timestamp_start: float
    timestamp_end: float
    original: str
    suggestion: str
    explanation: str


class VocabularySuggestionRead(BaseModel):
    timestamp_start: float
    timestamp_end: float
    original: str
    alternative: str
    explanation: str


class LanguageAnalysisRead(BaseModel):
    summary: str
    strengths: list[str]
    major_improvements: list[str]
    grammar_issues: list[GrammarIssueRead]
    clarity_suggestions: list[ClaritySuggestionRead]
    vocabulary_suggestions: list[VocabularySuggestionRead]
    practice_exercise: str


class AvailableLanguageFeedback(BaseModel):
    status: Literal["available"]
    model: str
    analysis: LanguageAnalysisRead


class UnavailableLanguageFeedback(BaseModel):
    status: Literal["unavailable"]
    reason: Literal["not_configured", "no_speech", "provider_error"]


LanguageFeedback = Annotated[
    AvailableLanguageFeedback | UnavailableLanguageFeedback,
    Field(discriminator="status"),
]


class VisionFeedback(BaseModel):
    status: Literal["available", "unavailable"]
    reason: (
        Literal["models_missing", "runtime_missing", "decode_error", "no_person"] | None
    ) = None
    sample_interval_seconds: float | None = None
    sampled_frames: int = 0
    face_frames: int = 0
    pose_frames: int = 0
    hand_frames: int = 0
    facing_camera_percent: float | None = None
    head_left_percent: float | None = None
    head_center_percent: float | None = None
    head_right_percent: float | None = None
    hands_visible_percent: float | None = None
    body_movement_percent: float | None = None


class AnalysisJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    session_id: UUID
    status: Literal[
        "queued",
        "transcribing",
        "analyzing_fluency",
        "analyzing_english",
        "analyzing_vision",
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
    language_feedback: LanguageFeedback | None
    vision_feedback: VisionFeedback | None
    error_message: str | None
