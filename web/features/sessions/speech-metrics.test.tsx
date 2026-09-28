import { expect, test } from "bun:test";
import { render, screen } from "@testing-library/react";
import { SpeechMetrics } from "./speech-metrics";

test("shows measured pace, pauses, hesitations and repetitions", () => {
  render(<SpeechMetrics metrics={{
    total_words: 7,
    speech_span_seconds: 5.7,
    words_per_minute: 73.7,
    pause_count: 3,
    average_pause_seconds: 1.07,
    long_pause_count: 1,
    filler_count: 2,
    filler_frequency_per_100_words: 28.6,
    repetition_count: 1,
    fillers: [{ word: "um", start: 0 }],
    pauses: [{ start: 1.2, end: 3.2, duration: 2 }],
    repetitions: [{ word: "like", start: 3.2 }],
  }} />);
  expect(screen.getByText("73.7")).toBeTruthy();
  expect(screen.getByText("1.07 s")).toBeTruthy();
  expect(screen.getByText("Hesitation words")).toBeTruthy();
  expect(screen.getByText("Immediate repeated words")).toBeTruthy();
});
