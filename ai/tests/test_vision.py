from ai.vision.analyze import FrameObservation, summarize_observations


def test_vision_summary_uses_detected_frames_and_visible_movement() -> None:
    observations = [
        FrameObservation("center", True, True, (0.5, 0.5), 0.3),
        FrameObservation("left", False, True, (0.55, 0.5), 0.3),
        FrameObservation(None, False, True, (0.7, 0.5), 0.3),
    ]
    result = summarize_observations(observations)
    assert result["status"] == "available"
    assert result["facing_camera_percent"] == 50
    assert result["head_left_percent"] == 50
    assert result["hands_visible_percent"] == 33.3
    assert result["body_movement_percent"] == 100


def test_vision_summary_distinguishes_no_detection_from_zero() -> None:
    result = summarize_observations([FrameObservation(None, False, False, None, None)])
    assert result == {
        "status": "unavailable",
        "reason": "no_person",
        "sampled_frames": 1,
    }
