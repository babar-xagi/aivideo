import { afterEach, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { Transcript } from "./transcript";

afterEach(cleanup);

test("renders recognized speech with segment timestamps", () => {
  render(<Transcript transcript={{
    language: "en",
    model: "tiny.en",
    duration_seconds: 68,
    text: "Hello there. This is my story.",
    segments: [
      { start: 0.2, end: 1.8, text: "Hello there." },
      { start: 62.1, end: 67.9, text: "This is my story." },
    ],
  }} />);
  expect(screen.getByText("00:00–00:01")).toBeTruthy();
  expect(screen.getByText("01:02–01:07")).toBeTruthy();
  expect(screen.getByText("Hello there.")).toBeTruthy();
  expect(screen.getByText("This is my story.")).toBeTruthy();
});

test("empty speech result is explained without fabricated words", () => {
  render(<Transcript transcript={{
    language: "en",
    model: "tiny.en",
    duration_seconds: 4,
    text: "",
    segments: [],
  }} />);
  expect(screen.getByText("No speech was detected in this recording.")).toBeTruthy();
});
