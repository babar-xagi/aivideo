import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAnalysisJob, getPracticeSession, getRecordingUrl, practiceTypes } from "@/lib/sessions";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Recorder } from "@/features/recorder/recorder";
import { AnalysisProgress } from "@/features/sessions/analysis-progress";
import { Transcript } from "@/features/sessions/transcript";
import { SpeechMetrics } from "@/features/sessions/speech-metrics";
import { LanguageFeedback } from "@/features/sessions/language-feedback";
import { SessionReport } from "@/features/sessions/session-report";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  if (!getSupabaseConfig()) {
    redirect("/auth/sign-in?error=not-configured");
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) {
    redirect("/auth/sign-in");
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    redirect("/auth/sign-in");
  }
  const { id } = await params;
  const session = await getPracticeSession(token, id);
  if (!session) {
    notFound();
  }
  const style = practiceTypes.find((type) => type.value === session.practice_type)?.label ?? "Practice";
  const saved = !["created", "uploading"].includes(session.status);
  const [recordingUrl, analysisJob] = saved
    ? await Promise.all([getRecordingUrl(token, id), getAnalysisJob(token, id)])
    : [null, null];
  const { error: pageError } = await searchParams;
  const completedJob = session.status === "completed" && analysisJob?.report ? analysisJob : null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-8 sm:px-10">
      <Link href="/dashboard" className="text-sm font-semibold text-sky-800 hover:underline">← Dashboard</Link>
      <div className="mt-14">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Practice session</p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-950">{session.topic}</h1>
        <p className="mt-4 text-slate-600">{style} · Created {new Date(session.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {completedJob ? (
        <SessionReport session={session} job={completedJob} recordingUrl={recordingUrl} />
      ) : saved ? (
        <section aria-labelledby="saved-recording-heading" className="mt-10 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <h2 id="saved-recording-heading" className="text-xl font-semibold text-slate-900">Your saved recording</h2>
          <p className="mt-2 text-sm text-slate-600">Stored privately. Only your signed-in session can request a temporary playback link.</p>
          {recordingUrl ? (
            <video controls playsInline preload="metadata" src={recordingUrl} className="mt-6 aspect-video w-full rounded-xl bg-slate-950" aria-label="Saved practice recording" />
          ) : (
            <p role="alert" className="mt-5 text-sm text-rose-700">Playback is unavailable right now. Refresh this page to try again.</p>
          )}
        </section>
      ) : (
        <Recorder sessionId={session.id} />
      )}

      {pageError === "analysis-failed" && (
        <p role="alert" className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">Analysis could not be started. Please try again.</p>
      )}
      {session.status === "uploaded" && (
        <section aria-labelledby="start-analysis-heading" className="mt-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <h2 id="start-analysis-heading" className="text-xl font-semibold text-slate-900">Ready to transcribe</h2>
          <p className="mt-2 text-sm text-slate-600">The worker will transcribe your English speech and measure speaking pace, pauses, and hesitation words. Coaching suggestions are still general examples.</p>
          <form action={`/sessions/${session.id}/analysis`} method="post" className="mt-6">
            <button type="submit" className="rounded-xl bg-sky-800 px-6 py-3 font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800">Transcribe recording</button>
          </form>
        </section>
      )}
      {(session.status === "queued" || session.status === "processing") && analysisJob && (
        <AnalysisProgress status={analysisJob.status} />
      )}
      {(session.status === "queued" || session.status === "processing") && !analysisJob && (
        <p role="alert" className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">Analysis status is unavailable. Refresh this page to try again.</p>
      )}
      {!completedJob && analysisJob?.transcript && <Transcript transcript={analysisJob.transcript} />}
      {!completedJob && analysisJob?.metrics && <SpeechMetrics metrics={analysisJob.metrics} />}
      {!completedJob && analysisJob?.language_feedback?.status === "available" && <LanguageFeedback analysis={analysisJob.language_feedback.analysis} />}
      {session.status === "failed" && (
        <section aria-labelledby="analysis-error-heading" className="mt-8 rounded-2xl border border-rose-200 bg-rose-50 p-7">
          <h2 id="analysis-error-heading" className="text-xl font-semibold text-rose-900">Transcription or report creation failed</h2>
          <p className="mt-2 text-sm text-rose-800">{analysisJob?.error_message ?? "Please try again."}</p>
          <form action={`/sessions/${session.id}/analysis`} method="post" className="mt-5">
            <button type="submit" className="rounded-xl bg-sky-800 px-6 py-3 font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800">Retry analysis</button>
          </form>
        </section>
      )}

      <div className="mt-8">
        <Link href="/sessions/new" className="text-sm font-semibold text-sky-800 hover:underline">
          Create another session
        </Link>
      </div>

      <form action={`/sessions/${session.id}/delete`} method="post" className="mt-8">
        <button type="submit" className="text-sm font-semibold text-rose-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700">Delete this session</button>
      </form>
    </main>
  );
}
