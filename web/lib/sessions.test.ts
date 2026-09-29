import { afterEach, expect, test } from "bun:test";
import { getAnalysisJob, getPracticeSession } from "./sessions";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

test("a missing session remains distinct from an unavailable API", async () => {
  globalThis.fetch = Object.assign(async () => new Response(null, { status: 404 }), { preconnect: originalFetch.preconnect });
  expect(await getPracticeSession("token", "session-id")).toBeNull();

  globalThis.fetch = Object.assign(async () => new Response(null, { status: 503 }), { preconnect: originalFetch.preconnect });
  await expect(getPracticeSession("token", "session-id")).rejects.toThrow("Session service unavailable");
});

test("analysis outage cannot hide a saved report as if no job existed", async () => {
  globalThis.fetch = Object.assign(async () => new Response(null, { status: 404 }), { preconnect: originalFetch.preconnect });
  expect(await getAnalysisJob("token", "session-id")).toBeNull();
  globalThis.fetch = Object.assign(async () => new Response(null, { status: 503 }), { preconnect: originalFetch.preconnect });
  await expect(getAnalysisJob("token", "session-id")).rejects.toThrow("Analysis service unavailable");
});
