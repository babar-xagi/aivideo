import wave
from pathlib import Path
from types import SimpleNamespace

import pytest
from ai.speech import transcribe


def test_invalid_media_cannot_produce_a_transcript(tmp_path: Path) -> None:
    recording = tmp_path / "invalid.webm"
    recording.write_bytes(b"not a recording")
    with pytest.raises(transcribe.TranscriptionError):
        transcribe.transcribe_recording(recording)


def test_ffmpeg_audio_and_timestamp_mapping(tmp_path: Path, monkeypatch) -> None:
    recording = tmp_path / "recording.wav"
    with wave.open(str(recording), "wb") as sound:
        sound.setnchannels(1)
        sound.setsampwidth(2)
        sound.setframerate(16000)
        sound.writeframes(b"\x00\x00" * 16000)

    class FakeModel:
        def transcribe(self, path: str, **kwargs):
            assert Path(path).is_file()
            assert kwargs["language"] == "en"
            assert kwargs["word_timestamps"] is True
            return (
                [
                    SimpleNamespace(
                        start=0.123,
                        end=0.9,
                        text=" Hello world. ",
                        words=[
                            SimpleNamespace(start=0.123, end=0.4, word=" Hello"),
                            SimpleNamespace(start=0.45, end=0.9, word=" world."),
                        ],
                    ),
                    SimpleNamespace(start=0.9, end=1.0, text=" ", words=[]),
                ],
                SimpleNamespace(duration=1.0),
            )

    monkeypatch.setattr(transcribe, "_get_model", lambda *args: FakeModel())
    result = transcribe.transcribe_recording(recording)
    assert result["text"] == "Hello world."
    assert result["segments"] == [{"start": 0.12, "end": 0.9, "text": "Hello world."}]
    assert result["words"] == [
        {"start": 0.12, "end": 0.4, "text": "Hello"},
        {"start": 0.45, "end": 0.9, "text": "world."},
    ]
