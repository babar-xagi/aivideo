"""Deterministic fluency measures from recognized word timestamps."""

import re

PAUSE_SECONDS = 0.5
LONG_PAUSE_SECONDS = 2.0
FILLERS = {"um", "uh", "erm", "hmm"}


def _spoken_word(value: str) -> str:
    return re.sub(r"(^[^\w']+|[^\w']+$)", "", value.lower())


def calculate_speech_metrics(transcript: dict) -> dict:
    words = [
        {
            "start": float(word["start"]),
            "end": float(word["end"]),
            "text": str(word["text"]),
            "normalized": _spoken_word(str(word["text"])),
        }
        for word in transcript["words"]
        if _spoken_word(str(word["text"]))
    ]
    words.sort(key=lambda word: (word["start"], word["end"]))
    fillers = [
        {"word": word["normalized"], "start": word["start"]}
        for word in words
        if word["normalized"] in FILLERS
    ]
    repetitions = [
        {"word": current["normalized"], "start": current["start"]}
        for previous, current in zip(words, words[1:])
        if previous["normalized"] == current["normalized"]
        and not previous["text"].endswith((".", "?", "!"))
    ]
    pauses = [
        {
            "start": previous["end"],
            "end": current["start"],
            "duration": round(current["start"] - previous["end"], 2),
        }
        for previous, current in zip(words, words[1:])
        if current["start"] - previous["end"] >= PAUSE_SECONDS
    ]
    count = len(words)
    span = round(max(words[-1]["end"] - words[0]["start"], 0), 2) if words else 0
    long_pauses = [pause for pause in pauses if pause["duration"] >= LONG_PAUSE_SECONDS]
    return {
        "total_words": count,
        "speech_span_seconds": span,
        "words_per_minute": round(count * 60 / span, 1)
        if count >= 2 and span > 0
        else None,
        "pause_count": len(pauses),
        "average_pause_seconds": round(
            sum(p["duration"] for p in pauses) / len(pauses), 2
        )
        if pauses
        else None,
        "long_pause_count": len(long_pauses),
        "filler_count": len(fillers),
        "filler_frequency_per_100_words": round(len(fillers) * 100 / count, 1)
        if count
        else None,
        "repetition_count": len(repetitions),
        "fillers": fillers,
        "pauses": pauses,
        "repetitions": repetitions,
    }
