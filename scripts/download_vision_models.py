"""Cache Google's official MediaPipe task bundles for the local vision worker."""

from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT / ".cache" / "models" / "vision"
MODEL_URLS = {
    "face_landmarker.task": "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
    "hand_landmarker.task": "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
    "pose_landmarker_lite.task": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
}


def main() -> None:
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for name, url in MODEL_URLS.items():
        target = DESTINATION / name
        if target.is_file():
            print(f"Using cached {name}")
            continue
        temporary = target.with_suffix(".download")
        try:
            with urlopen(url, timeout=60) as source, temporary.open("wb") as output:
                while chunk := source.read(1024 * 1024):
                    output.write(chunk)
            if temporary.stat().st_size < 100_000:
                raise ValueError(f"Downloaded model is too small: {name}")
            temporary.replace(target)
            print(f"Downloaded {name}")
        finally:
            temporary.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
