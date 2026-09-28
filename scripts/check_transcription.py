"""Verify real English speech transcription with OpenAI Whisper's test audio."""

import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

import imageio_ffmpeg
from ai.speech.metrics import calculate_speech_metrics
from ai.speech.transcribe import transcribe_recording

ROOT = Path(__file__).resolve().parents[1]
SAMPLE_AUDIO = ROOT / "local_data" / "jfk.flac"


def make_sample_video(output: Path) -> None:
    if not SAMPLE_AUDIO.is_file():
        raise FileNotFoundError(
            "Download the Whisper JFK test audio to local_data/jfk.flac first"
        )
    command = [
        imageio_ffmpeg.get_ffmpeg_exe(),
        "-nostdin",
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=320x180:r=1",
        "-i",
        str(SAMPLE_AUDIO),
        "-shortest",
        "-c:v",
        "mpeg4",
        "-q:v",
        "5",
        "-c:a",
        "aac",
        "-b:a",
        "64k",
        "-movflags",
        "+faststart",
        "-y",
        str(output),
    ]
    subprocess.run(command, check=True, capture_output=True, timeout=60)


def main() -> None:
    with TemporaryDirectory(prefix="english-coach-check-") as temp_dir:
        recording = Path(temp_dir) / "speech.mp4"
        make_sample_video(recording)
        transcript = transcribe_recording(recording)
    assert transcript["language"] == "en"
    assert transcript["segments"]
    assert transcript["words"]
    text = str(transcript["text"]).lower()
    assert "my fellow americans" in text, text
    assert "your country" in text, text
    for segment in transcript["segments"]:
        assert 0 <= segment["start"] < segment["end"] <= 12
    for word in transcript["words"]:
        assert 0 <= word["start"] < word["end"] <= 12
    metrics = calculate_speech_metrics(transcript)
    assert metrics["total_words"] == len(transcript["words"])
    assert metrics["words_per_minute"] is not None
    print("Real English transcription passed with timestamped segments:")
    for segment in transcript["segments"]:
        print(f"{segment['start']:.2f}–{segment['end']:.2f}s: {segment['text']}")
    print(f"{metrics['total_words']} words, {metrics['words_per_minute']} WPM")


if __name__ == "__main__":
    main()
