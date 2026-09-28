import { afterEach, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { MockReport } from "./mock-report";

afterEach(cleanup);

test("sample report clearly states that recording analysis has not run", () => {
  render(
    <MockReport report={{
      mode: "mock",
      title: "Sample coaching report",
      summary: "Your recording was not transcribed or evaluated.",
      topic: "My day",
      practice_suggestions: ["Use one clear example."],
      generated_at: "2026-09-28T00:00:00Z",
      transcription_available: false,
    }} />,
  );
  expect(screen.getByText("Demo output · No recording analysis")).toBeTruthy();
  expect(screen.getByText("Your recording was not transcribed or evaluated.")).toBeTruthy();
  expect(screen.getByText("Use one clear example.")).toBeTruthy();
});

test("report distinguishes real transcription from sample coaching", () => {
  render(
    <MockReport report={{
      mode: "mock",
      title: "Sample coaching report",
      summary: "Your recording was transcribed. Coaching remains an example.",
      topic: "My day",
      practice_suggestions: ["Use one clear example."],
      generated_at: "2026-09-28T00:00:00Z",
      transcription_available: true,
    }} />,
  );
  expect(screen.getByText("Sample coaching · Transcript is real")).toBeTruthy();
  expect(screen.getByText("Speech metrics and language feedback appear separately above when available. These presentation ideas remain general examples.")).toBeTruthy();
});
