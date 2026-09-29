import { afterEach, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import type { PracticeSession } from "@/lib/sessions";
import { PrivacyControls } from "./privacy-controls";

afterEach(cleanup);

const session: PracticeSession = {
  id: "session-1", topic: "A story", practice_type: "tell_a_story", status: "completed",
  created_at: "2026-09-28T00:00:00Z", started_at: null, completed_at: null,
  duration_seconds: 20, recording_object_key: "private-recording", vision_enabled: true,
};

test("privacy controls explain deletion and let the owner turn off video analysis", () => {
  const { container } = render(<PrivacyControls session={session} />);
  expect(screen.getByRole("button", { name: "Turn off video analysis" })).toBeTruthy();
  expect(container.querySelector('input[name="enabled"]')?.getAttribute("value")).toBe("false");
  expect(screen.getByText(/permanently deletes the saved recording/)).toBeTruthy();
  expect(container.querySelector('input[name="confirm"]')?.hasAttribute("required")).toBe(true);
});

test("video preference cannot change while analysis is running", () => {
  render(<PrivacyControls session={{ ...session, status: "processing", vision_enabled: false }} />);
  expect(screen.queryByRole("button", { name: /video analysis/ })).toBeNull();
  expect(screen.getByText(/when the current analysis finishes/)).toBeTruthy();
});
