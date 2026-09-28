from ai.speech.metrics import calculate_speech_metrics


def test_calculates_pace_pauses_fillers_and_repetitions() -> None:
    words = [
        (0.0, 0.3, "Um,"),
        (0.4, 0.7, "I"),
        (0.8, 1.2, "like"),
        (3.2, 3.5, "like"),
        (3.6, 3.9, "uh"),
        (4.5, 4.8, "today."),
        (5.4, 5.7, "Today"),
    ]
    metrics = calculate_speech_metrics(
        {
            "words": [
                {"start": start, "end": end, "text": text} for start, end, text in words
            ]
        }
    )
    assert metrics["total_words"] == 7
    assert metrics["speech_span_seconds"] == 5.7
    assert metrics["words_per_minute"] == 73.7
    assert metrics["pause_count"] == 3
    assert metrics["average_pause_seconds"] == 1.07
    assert metrics["long_pause_count"] == 1
    assert metrics["filler_count"] == 2
    assert metrics["filler_frequency_per_100_words"] == 28.6
    assert metrics["repetition_count"] == 1
    assert metrics["repetitions"] == [{"word": "like", "start": 3.2}]


def test_empty_transcript_has_no_fabricated_rates() -> None:
    metrics = calculate_speech_metrics({"words": []})
    assert metrics["total_words"] == 0
    assert metrics["words_per_minute"] is None
    assert metrics["average_pause_seconds"] is None
    assert metrics["filler_frequency_per_100_words"] is None
    assert metrics["pause_count"] == metrics["repetition_count"] == 0
