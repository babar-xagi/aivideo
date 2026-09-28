import json

import httpx
import pytest
from ai.language.coach import LanguageCoachError, OpenAILanguageCoach

TRANSCRIPT = {
    "text": "Yesterday I go to school.",
    "duration_seconds": 3.0,
    "segments": [{"start": 0.0, "end": 3.0, "text": "Yesterday I go to school."}],
}
ANALYSIS = {
    "summary": "Your meaning was clear, with one tense to review.",
    "strengths": ["Your message was easy to follow."],
    "major_improvements": ["Use past tense for yesterday."],
    "grammar_issues": [
        {
            "timestamp_start": 0.0,
            "timestamp_end": 3.0,
            "original": "Yesterday I go to school",
            "suggestion": "Yesterday I went to school",
            "explanation": "Use went for a past event.",
            "category": "verb_tense",
            "severity": "medium",
        }
    ],
    "clarity_suggestions": [],
    "vocabulary_suggestions": [],
    "practice_exercise": "Tell one short story about yesterday using past tense.",
}


def response_for(analysis: object) -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "status": "completed",
            "output": [
                {"content": [{"type": "output_text", "text": json.dumps(analysis)}]}
            ],
        },
        request=httpx.Request("POST", "https://api.openai.com/v1/responses"),
    )


def test_openai_adapter_sends_structured_request_and_validates(monkeypatch) -> None:
    def fake_post(url, *, headers, json, timeout):
        assert url == "https://api.openai.com/v1/responses"
        assert headers["Authorization"] == "Bearer test-only-key"
        assert json["store"] is False
        assert json["text"]["format"]["strict"] is True
        assert json["text"]["format"]["schema"]["additionalProperties"] is False
        assert timeout == 60
        return response_for(ANALYSIS)

    monkeypatch.setattr(httpx, "post", fake_post)
    result = OpenAILanguageCoach("test-only-key").analyze(
        TRANSCRIPT, {"total_words": 5}, {"topic": "My day"}
    )
    assert result.grammar_issues[0].suggestion == "Yesterday I went to school"


@pytest.mark.parametrize(
    "bad_output",
    [
        {"summary": "Missing required fields"},
        {
            **ANALYSIS,
            "grammar_issues": [
                {**ANALYSIS["grammar_issues"][0], "original": "A sentence never spoken"}
            ],
        },
        {
            **ANALYSIS,
            "grammar_issues": [
                {**ANALYSIS["grammar_issues"][0], "timestamp_end": 50.0}
            ],
        },
    ],
)
def test_invalid_provider_feedback_is_rejected(monkeypatch, bad_output) -> None:
    monkeypatch.setattr(httpx, "post", lambda *args, **kwargs: response_for(bad_output))
    with pytest.raises(LanguageCoachError):
        OpenAILanguageCoach("test-only-key").analyze(TRANSCRIPT, {}, {})


def test_provider_refusal_is_rejected(monkeypatch) -> None:
    refused = httpx.Response(
        200,
        json={"status": "completed", "output": [{"content": [{"type": "refusal"}]}]},
        request=httpx.Request("POST", "https://api.openai.com/v1/responses"),
    )
    monkeypatch.setattr(httpx, "post", lambda *args, **kwargs: refused)
    with pytest.raises(LanguageCoachError):
        OpenAILanguageCoach("test-only-key").analyze(TRANSCRIPT, {}, {})
