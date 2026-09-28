import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { AnalysisJob, PracticeSession } from "@/lib/sessions";
import { SessionReport } from "./session-report";
import { buildTimelineEvents } from "./timeline";

afterEach(cleanup);

const practiceSession: PracticeSession = {
  id: "session-1",
  topic: "Yesterday",
  practice_type: "tell_a_story",
  status: "completed",
  created_at: "2026-09-28T00:00:00Z",
  started_at: null,
  completed_at: null,
  duration_seconds: 12,
  recording_object_key: "private-recording",
};

const job: AnalysisJob = {
  id: "job-1",
  session_id: "session-1",
  status: "completed",
  created_at: "2026-09-28T00:00:00Z",
  updated_at: "2026-09-28T00:00:00Z",
  error_message: null,
  transcript: {
    language: "en",
    model: "tiny.en",
    duration_seconds: 12,
    text: "Um, yesterday I go to school. It was good.",
    segments: [
      { start: 0, end: 4, text: "Um, yesterday I go to school." },
      { start: 6, end: 10, text: "It was good." },
    ],
    words: [],
  },
  metrics: {
    total_words: 9,
    speech_span_seconds: 10,
    words_per_minute: 54,
    pause_count: 1,
    average_pause_seconds: 2,
    long_pause_count: 1,
    filler_count: 1,
    filler_frequency_per_100_words: 11.1,
    repetition_count: 0,
    fillers: [{ word: "um", start: 0 }],
    pauses: [{ start: 4, end: 6, duration: 2 }],
    repetitions: [],
  },
  language_feedback: {
    status: "available",
    model: "test-model",
    analysis: {
      summary: "Your story was easy to follow.",
      strengths: ["You gave a clear example."],
      major_improvements: ["Practice past tense."],
      grammar_issues: [{ timestamp_start: 2, timestamp_end: 4, original: "I go", suggestion: "I went", explanation: "Use past tense for yesterday.", category: "verb_tense", severity: "medium" }],
      clarity_suggestions: [],
      vocabulary_suggestions: [{ timestamp_start: 8, timestamp_end: 9, original: "good", alternative: "helpful", explanation: "More specific here." }],
      practice_exercise: "Tell another story about yesterday.",
    },
  },
  report: {
    mode: "mock",
    title: "Sample coaching report",
    summary: "These are general examples.",
    topic: "Yesterday",
    practice_suggestions: ["Use an example."],
    generated_at: "2026-09-28T00:00:00Z",
    transcription_available: true,
  },
};

test("timeline uses only recorded timed events", () => {
  const events = buildTimelineEvents(job.metrics, job.language_feedback);
  expect(events.map((event) => event.kind)).toEqual(["hesitation", "grammar", "pause", "vocabulary"]);
  expect(buildTimelineEvents(null, null)).toEqual([]);
});

test("timeline, transcript, and correction timestamps seek the video", () => {
  render(<SessionReport session={practiceSession} job={job} recordingUrl="https://storage.test/clip.mp4" />);
  const video = screen.getByLabelText("Saved practice recording") as HTMLVideoElement;
  Object.defineProperty(video, "duration", { configurable: true, value: 12 });

  const timeline = screen.getByRole("group", { name: "Timed recording events" });
  const grammarMarker = within(timeline).getByRole("button", { name: "Jump to 0:02 — Grammar: I go" });
  expect(grammarMarker.hasAttribute("disabled")).toBe(true);
  fireEvent.loadedMetadata(video);
  expect(grammarMarker.hasAttribute("disabled")).toBe(false);

  fireEvent.click(grammarMarker);
  expect(video.currentTime).toBe(2);
  fireEvent.click(screen.getByRole("button", { name: "Jump to 00:06 — It was good." }));
  expect(video.currentTime).toBe(6);
  const languageSection = screen.getByRole("heading", { name: "English language coach" }).closest("section") as HTMLElement;
  fireEvent.click(within(languageSection).getByRole("button", { name: "Jump to 0:08 — Vocabulary: good" }));
  expect(video.currentTime).toBe(8);
  expect(screen.getAllByText("Your story was easy to follow.").length).toBe(2);
  expect(screen.getByText("54 WPM")).toBeTruthy();
});

test("report keeps sample guidance labeled and disables seeking without playback", () => {
  render(<SessionReport session={practiceSession} job={job} recordingUrl={null} />);
  expect(screen.getByRole("alert").textContent).toContain("Playback is unavailable");
  expect(screen.getByText("Sample coaching · Transcript is real")).toBeTruthy();
  const timeline = screen.getByRole("group", { name: "Timed recording events" });
  expect(within(timeline).getByRole("button", { name: "Jump to 0:02 — Grammar: I go" }).hasAttribute("disabled")).toBe(true);
});
