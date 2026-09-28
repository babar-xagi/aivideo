"""Run the installed MediaPipe models against a temporary blank video."""

import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory

import imageio_ffmpeg
from ai.vision.analyze import analyze_recording

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    with TemporaryDirectory(prefix="english-coach-vision-check-") as temporary:
        recording = Path(temporary) / "blank.mp4"
        subprocess.run(
            [
                imageio_ffmpeg.get_ffmpeg_exe(),
                "-nostdin",
                "-v",
                "error",
                "-f",
                "lavfi",
                "-i",
                "color=c=black:s=320x240:d=6",
                "-c:v",
                "mpeg4",
                "-y",
                str(recording),
            ],
            check=True,
            timeout=30,
        )
        result = analyze_recording(recording, ROOT / ".cache" / "models" / "vision")
    assert result["status"] == "unavailable" and result["reason"] == "no_person", result
    print(f"MediaPipe decoded {result['sampled_frames']} frames as expected")


if __name__ == "__main__":
    main()
