"""Sample a private recording and aggregate observable landmark measurements."""

import logging
import subprocess
from dataclasses import dataclass
from pathlib import Path

import imageio_ffmpeg
import numpy as np

logger = logging.getLogger(__name__)
FRAME_WIDTH = 320
FRAME_HEIGHT = 240
SAMPLE_INTERVAL_SECONDS = 5
MAX_FRAMES = 120
FRAME_BYTES = FRAME_WIDTH * FRAME_HEIGHT * 3
MODEL_NAMES = (
    "face_landmarker.task",
    "hand_landmarker.task",
    "pose_landmarker_lite.task",
)


@dataclass(frozen=True)
class FrameObservation:
    head_orientation: str | None
    hands_visible: bool
    pose_visible: bool
    shoulder_center: tuple[float, float] | None
    shoulder_width: float | None


def _percent(count: int, total: int) -> float | None:
    return round(100 * count / total, 1) if total else None


def summarize_observations(observations: list[FrameObservation]) -> dict:
    faces = [item.head_orientation for item in observations if item.head_orientation]
    pose_frames = sum(item.pose_visible for item in observations)
    hand_frames = sum(item.hands_visible for item in observations)
    moved = 0
    comparable = 0
    previous: FrameObservation | None = None
    for item in observations:
        if (
            item.shoulder_center
            and item.shoulder_width
            and previous
            and previous.shoulder_center
        ):
            displacement = (
                sum(
                    (current - before) ** 2
                    for current, before in zip(
                        item.shoulder_center, previous.shoulder_center
                    )
                )
                ** 0.5
            )
            comparable += 1
            moved += displacement / item.shoulder_width >= 0.15
        previous = item

    if not faces and not pose_frames and not hand_frames:
        return {
            "status": "unavailable",
            "reason": "no_person",
            "sampled_frames": len(observations),
        }
    return {
        "status": "available",
        "reason": None,
        "sample_interval_seconds": SAMPLE_INTERVAL_SECONDS,
        "sampled_frames": len(observations),
        "face_frames": len(faces),
        "pose_frames": pose_frames,
        "hand_frames": hand_frames,
        "facing_camera_percent": _percent(faces.count("center"), len(faces)),
        "head_left_percent": _percent(faces.count("left"), len(faces)),
        "head_center_percent": _percent(faces.count("center"), len(faces)),
        "head_right_percent": _percent(faces.count("right"), len(faces)),
        "hands_visible_percent": _percent(hand_frames, len(observations)),
        "body_movement_percent": _percent(moved, comparable),
    }


def _head_orientation(landmarks: list) -> str | None:
    if len(landmarks) <= 263:
        return None
    left_eye = landmarks[33].x
    right_eye = landmarks[263].x
    eye_width = abs(right_eye - left_eye)
    if eye_width < 0.02:
        return None
    nose_offset = (landmarks[1].x - (left_eye + right_eye) / 2) / eye_width
    if nose_offset < -0.13:
        return "left"
    if nose_offset > 0.13:
        return "right"
    return "center"


def _shoulders(landmarks: list) -> tuple[tuple[float, float], float] | None:
    if (
        len(landmarks) <= 12
        or min(landmarks[11].visibility, landmarks[12].visibility) < 0.5
    ):
        return None
    left, right = landmarks[11], landmarks[12]
    width = ((left.x - right.x) ** 2 + (left.y - right.y) ** 2) ** 0.5
    if width < 0.03:
        return None
    return ((left.x + right.x) / 2, (left.y + right.y) / 2), width


def _sample_frames(recording: Path) -> list[np.ndarray]:
    command = [
        imageio_ffmpeg.get_ffmpeg_exe(),
        "-nostdin",
        "-v",
        "error",
        "-i",
        str(recording),
        "-vf",
        f"fps=1/{SAMPLE_INTERVAL_SECONDS},scale={FRAME_WIDTH}:{FRAME_HEIGHT}:force_original_aspect_ratio=decrease,pad={FRAME_WIDTH}:{FRAME_HEIGHT}:(ow-iw)/2:(oh-ih)/2",
        "-frames:v",
        str(MAX_FRAMES),
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "pipe:1",
    ]
    result = subprocess.run(command, capture_output=True, check=False, timeout=180)
    if result.returncode or not result.stdout or len(result.stdout) % FRAME_BYTES:
        raise ValueError("Video frames could not be decoded")
    pixels = np.frombuffer(result.stdout, dtype=np.uint8)
    return [
        frame.copy() for frame in pixels.reshape((-1, FRAME_HEIGHT, FRAME_WIDTH, 3))
    ]


def analyze_recording(recording: Path, model_dir: Path) -> dict:
    if any(not (model_dir / name).is_file() for name in MODEL_NAMES):
        return {"status": "unavailable", "reason": "models_missing"}
    try:
        frames = _sample_frames(recording)
    except (OSError, subprocess.TimeoutExpired, ValueError):
        logger.warning("Vision frame decoding unavailable")
        return {"status": "unavailable", "reason": "decode_error"}

    import mediapipe as mp

    base = mp.tasks.BaseOptions
    vision = mp.tasks.vision
    video_mode = vision.RunningMode.VIDEO
    observations: list[FrameObservation] = []
    with (
        vision.FaceLandmarker.create_from_options(
            vision.FaceLandmarkerOptions(
                base_options=base(model_asset_path=str(model_dir / MODEL_NAMES[0])),
                running_mode=video_mode,
                num_faces=1,
            )
        ) as face_task,
        vision.HandLandmarker.create_from_options(
            vision.HandLandmarkerOptions(
                base_options=base(model_asset_path=str(model_dir / MODEL_NAMES[1])),
                running_mode=video_mode,
                num_hands=2,
            )
        ) as hand_task,
        vision.PoseLandmarker.create_from_options(
            vision.PoseLandmarkerOptions(
                base_options=base(model_asset_path=str(model_dir / MODEL_NAMES[2])),
                running_mode=video_mode,
                num_poses=1,
            )
        ) as pose_task,
    ):
        for index, frame in enumerate(frames):
            timestamp_ms = index * SAMPLE_INTERVAL_SECONDS * 1000
            image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame)
            face = face_task.detect_for_video(image, timestamp_ms)
            hand = hand_task.detect_for_video(image, timestamp_ms)
            pose = pose_task.detect_for_video(image, timestamp_ms)
            shoulders = (
                _shoulders(pose.pose_landmarks[0]) if pose.pose_landmarks else None
            )
            observations.append(
                FrameObservation(
                    head_orientation=_head_orientation(face.face_landmarks[0])
                    if face.face_landmarks
                    else None,
                    hands_visible=bool(hand.hand_landmarks),
                    pose_visible=bool(pose.pose_landmarks),
                    shoulder_center=shoulders[0] if shoulders else None,
                    shoulder_width=shoulders[1] if shoulders else None,
                )
            )
    return summarize_observations(observations)
