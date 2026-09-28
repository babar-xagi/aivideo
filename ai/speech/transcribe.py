"""Transcribe a recording with FFmpeg and faster-whisper, outside the web API."""

import subprocess
from functools import lru_cache
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

import imageio_ffmpeg

DEFAULT_MODEL_CACHE = Path(__file__).resolve().parents[2] / ".cache" / "models"


class TranscriptionError(Exception):
    """The recording could not be decoded or transcribed."""


def extract_audio(recording: Path, output: Path) -> None:
    command = [
        imageio_ffmpeg.get_ffmpeg_exe(),
        "-nostdin",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        str(recording),
        "-t",
        "610",
        "-map",
        "0:a:0",
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-c:a",
        "pcm_s16le",
        "-y",
        str(output),
    ]
    try:
        subprocess.run(command, check=True, capture_output=True, timeout=300)
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
        raise TranscriptionError("Audio extraction failed") from exc
    if not output.is_file() or output.stat().st_size <= 44:
        raise TranscriptionError("Recording has no decodable audio")


@lru_cache(maxsize=2)
def _get_model(
    model_name: str,
    device: str,
    compute_type: str,
    cpu_threads: int,
    model_cache: str,
) -> Any:
    from faster_whisper import WhisperModel

    return WhisperModel(
        model_name,
        device=device,
        compute_type=compute_type,
        cpu_threads=cpu_threads,
        download_root=model_cache,
    )


def transcribe_recording(
    recording: Path,
    *,
    model_name: str = "tiny.en",
    device: str = "cpu",
    compute_type: str = "int8",
    cpu_threads: int = 4,
    model_cache: Path = DEFAULT_MODEL_CACHE,
) -> dict[str, object]:
    with TemporaryDirectory(prefix="english-coach-audio-") as temp_dir:
        audio = Path(temp_dir) / "audio.wav"
        extract_audio(recording, audio)
        try:
            model = _get_model(
                model_name,
                device,
                compute_type,
                cpu_threads,
                str(model_cache),
            )
            segments, info = model.transcribe(
                str(audio),
                language="en",
                task="transcribe",
                beam_size=5,
                vad_filter=True,
                word_timestamps=True,
                condition_on_previous_text=False,
            )
            transcript_segments = []
            transcript_words = []
            for segment in segments:
                if not segment.text.strip():
                    continue
                transcript_segments.append(
                    {
                        "start": round(segment.start, 2),
                        "end": round(segment.end, 2),
                        "text": segment.text.strip(),
                    }
                )
                for word in segment.words or []:
                    if word.word.strip():
                        transcript_words.append(
                            {
                                "start": round(word.start, 2),
                                "end": round(word.end, 2),
                                "text": word.word.strip(),
                            }
                        )
        except Exception as exc:
            raise TranscriptionError("Speech transcription failed") from exc

    return {
        "language": "en",
        "model": model_name,
        "duration_seconds": round(info.duration, 2),
        "text": " ".join(item["text"] for item in transcript_segments),
        "segments": transcript_segments,
        "words": transcript_words,
    }
