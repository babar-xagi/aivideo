"""Clearly labeled sample report used before real analysis is implemented."""

from datetime import UTC, datetime


def make_mock_report(topic: str, *, transcribed: bool = False) -> dict[str, object]:
    return {
        "mode": "mock",
        "title": "Sample coaching report",
        "summary": (
            "Your recording was transcribed. The coaching suggestions below are "
            "general examples and were not measured from your performance."
            if transcribed
            else "This is a sample report for the analysis workflow. "
            "Your recording was not transcribed or evaluated."
        ),
        "topic": topic,
        "practice_suggestions": [
            "Try opening with one clear sentence that states your main idea.",
            "Use one concrete example to explain your point.",
            "Finish by briefly restating the idea you want listeners to remember.",
        ],
        "generated_at": datetime.now(UTC).isoformat(),
        "transcription_available": transcribed,
    }
