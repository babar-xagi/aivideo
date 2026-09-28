import { afterEach, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { LanguageFeedback } from "./language-feedback";

afterEach(cleanup);

test("shows structured grammar, clarity, vocabulary, and practice guidance", () => {
  render(<LanguageFeedback analysis={{
    summary: "Your message was clear.",
    strengths: ["You gave a useful example."],
    major_improvements: ["Keep past tense consistent."],
    grammar_issues: [{ timestamp_start: 2, timestamp_end: 4, original: "I go", suggestion: "I went", explanation: "The event happened yesterday.", category: "verb_tense", severity: "medium" }],
    clarity_suggestions: [{ timestamp_start: 5, timestamp_end: 7, original: "this thing", suggestion: "the project", explanation: "Name the subject clearly." }],
    vocabulary_suggestions: [{ timestamp_start: 8, timestamp_end: 9, original: "good", alternative: "helpful", explanation: "More specific in this context." }],
    practice_exercise: "Tell a story about yesterday.",
  }} />);
  expect(screen.getByText("Your message was clear.")).toBeTruthy();
  expect(screen.getByText("Grammar")).toBeTruthy();
  expect(screen.getByText("Clarity")).toBeTruthy();
  expect(screen.getByText("Vocabulary")).toBeTruthy();
  expect(screen.getByText(/I go → I went/)).toBeTruthy();
  expect(screen.getByText(/Tell a story about yesterday/)).toBeTruthy();
});
