import { getBackendUrl } from "@/lib/backend";

export const practiceTypes = [
  { value: "talk_about_your_day", label: "Talk about your day" },
  { value: "explain_something", label: "Explain something you learned" },
  { value: "tell_a_story", label: "Tell a story" },
  { value: "short_presentation", label: "Give a short presentation" },
  { value: "job_interview", label: "Job interview answer" },
  { value: "ielts", label: "IELTS speaking practice" },
  { value: "free_speaking", label: "Free speaking" },
] as const;

export type PracticeType = (typeof practiceTypes)[number]["value"];

export type PracticeSession = {
  id: string;
  topic: string;
  practice_type: PracticeType;
  status: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  recording_object_key: string | null;
};

export type MockReport = {
  mode: "mock";
  title: string;
  summary: string;
  topic: string;
  practice_suggestions: string[];
  generated_at: string;
  transcription_available: boolean;
};

export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

export type TranscriptWord = TranscriptSegment;

export type Transcript = {
  language: "en";
  model: string;
  duration_seconds: number;
  text: string;
  segments: TranscriptSegment[];
  words?: TranscriptWord[] | null;
};

export type SpeechMetrics = {
  total_words: number;
  speech_span_seconds: number;
  words_per_minute: number | null;
  pause_count: number;
  average_pause_seconds: number | null;
  long_pause_count: number;
  filler_count: number;
  filler_frequency_per_100_words: number | null;
  repetition_count: number;
  fillers: Array<{ word: string; start: number }>;
  pauses: Array<{ start: number; end: number; duration: number }>;
  repetitions: Array<{ word: string; start: number }>;
};

export type LanguageAnalysis = {
  summary: string;
  strengths: string[];
  major_improvements: string[];
  grammar_issues: Array<{
    timestamp_start: number;
    timestamp_end: number;
    original: string;
    suggestion: string;
    explanation: string;
    category: string;
    severity: "low" | "medium" | "high";
  }>;
  clarity_suggestions: Array<{
    timestamp_start: number;
    timestamp_end: number;
    original: string;
    suggestion: string;
    explanation: string;
  }>;
  vocabulary_suggestions: Array<{
    timestamp_start: number;
    timestamp_end: number;
    original: string;
    alternative: string;
    explanation: string;
  }>;
  practice_exercise: string;
};

export type LanguageFeedback =
  | { status: "available"; model: string; analysis: LanguageAnalysis }
  | { status: "unavailable"; reason: "not_configured" | "no_speech" | "provider_error" };

export type VisionFeedback = {
  status: "available" | "unavailable";
  reason: "models_missing" | "runtime_missing" | "decode_error" | "no_person" | null;
  sample_interval_seconds: number | null;
  sampled_frames: number;
  face_frames: number;
  pose_frames: number;
  hand_frames: number;
  facing_camera_percent: number | null;
  head_left_percent: number | null;
  head_center_percent: number | null;
  head_right_percent: number | null;
  hands_visible_percent: number | null;
  body_movement_percent: number | null;
};

export type AnalysisStatus =
  | "queued"
  | "transcribing"
  | "analyzing_fluency"
  | "analyzing_english"
  | "analyzing_vision"
  | "analyzing_presentation"
  | "creating_feedback"
  | "completed"
  | "failed";

export type AnalysisJob = {
  id: string;
  session_id: string;
  status: AnalysisStatus;
  created_at: string;
  updated_at: string;
  report: MockReport | null;
  transcript: Transcript | null;
  metrics: SpeechMetrics | null;
  language_feedback: LanguageFeedback | null;
  vision_feedback: VisionFeedback | null;
  error_message: string | null;
};

function sessionUrl(path: string): URL {
  return new URL(`/api/sessions${path}`, getBackendUrl());
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function listPracticeSessions(
  token: string,
): Promise<PracticeSession[] | null> {
  try {
    const response = await fetch(sessionUrl(""), {
      headers: authHeaders(token),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok ? ((await response.json()) as PracticeSession[]) : null;
  } catch {
    return null;
  }
}

export async function getPracticeSession(
  token: string,
  id: string,
): Promise<PracticeSession | null> {
  try {
    const response = await fetch(sessionUrl(`/${encodeURIComponent(id)}`), {
      headers: authHeaders(token),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok ? ((await response.json()) as PracticeSession) : null;
  } catch {
    return null;
  }
}

export async function getRecordingUrl(token: string, id: string): Promise<string | null> {
  try {
    const response = await fetch(sessionUrl(`/${encodeURIComponent(id)}/recording-url`), {
      headers: authHeaders(token),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { download_url: string };
    return data.download_url;
  } catch {
    return null;
  }
}

export async function getAnalysisJob(token: string, id: string): Promise<AnalysisJob | null> {
  try {
    const response = await fetch(sessionUrl(`/${encodeURIComponent(id)}/analysis`), {
      headers: authHeaders(token),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok ? ((await response.json()) as AnalysisJob) : null;
  } catch {
    return null;
  }
}

export async function createPracticeSession(
  token: string,
  payload: { topic: string; practice_type: string },
): Promise<PracticeSession | null> {
  try {
    const response = await fetch(sessionUrl(""), {
      method: "POST",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok ? ((await response.json()) as PracticeSession) : null;
  } catch {
    return null;
  }
}

export async function deletePracticeSession(
  token: string,
  id: string,
): Promise<boolean> {
  try {
    const response = await fetch(sessionUrl(`/${encodeURIComponent(id)}`), {
      method: "DELETE",
      headers: authHeaders(token),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return response.status === 204;
  } catch {
    return false;
  }
}
