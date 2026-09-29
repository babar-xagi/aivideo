"use client";

import { useMemo, useRef, useState } from "react";
import type { AnalysisJob, PracticeSession } from "@/lib/sessions";
import { LanguageFeedback } from "./language-feedback";
import { MockReport } from "./mock-report";
import { SpeechMetrics } from "./speech-metrics";
import { Timeline, buildTimelineEvents, formatTime } from "./timeline";
import { Transcript } from "./transcript";
import { VisionReport } from "./vision-report";

function Snapshot({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">{value}</dd></div>;
}

export function SessionReport({
  session,
  job,
  recordingUrl,
}: {
  session: PracticeSession;
  job: AnalysisJob;
  recordingUrl: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState<number | null>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const events = useMemo(() => buildTimelineEvents(job.metrics, job.language_feedback), [job.metrics, job.language_feedback]);
  const duration = mediaDuration ?? Math.max(1, session.duration_seconds ?? 0, job.transcript?.duration_seconds ?? 0, ...events.map((event) => event.time + 0.1));
  const canSeek = Boolean(recordingUrl && mediaReady && !playbackError);

  function seekTo(seconds: number) {
    const video = videoRef.current;
    if (!video || !canSeek) return;
    const target = Math.min(Math.max(seconds, 0), Math.max(duration - 0.05, 0));
    video.currentTime = target;
    setCurrentTime(target);
    const reducedMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    video.scrollIntoView?.({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
  }

  const analysis = job.language_feedback?.status === "available" ? job.language_feedback.analysis : null;

  return (
    <section aria-labelledby="practice-report-heading" className="mt-10 space-y-8">
      <div className="rounded-2xl bg-slate-950 px-7 py-8 text-white shadow-sm sm:px-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Session report</p>
        <h2 id="practice-report-heading" className="mt-2 text-3xl font-semibold">Your practice at a glance</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{analysis ? analysis.summary : "Your recording and measured speech results are ready. Review the transcript and timeline to find moments to practice."}</p>
        <p className="mt-2 text-xs text-slate-400">{analysis ? "Summary generated from the automatic transcript" : "Summary based on saved session results"}</p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Snapshot label="Recording length" value={formatTime(duration)} />
        <Snapshot label="Recognized words" value={job.metrics?.total_words ?? "—"} />
        <Snapshot label="Speaking pace" value={job.metrics?.words_per_minute === null || job.metrics?.words_per_minute === undefined ? "—" : `${job.metrics.words_per_minute} WPM`} />
        <Snapshot label="Hesitations" value={job.metrics?.filler_count ?? "—"} />
        <Snapshot label="Long pauses" value={job.metrics?.long_pause_count ?? "—"} />
      </dl>

      <section aria-labelledby="saved-recording-heading" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 id="saved-recording-heading" className="text-xl font-semibold text-slate-950">Recording and timeline</h2>
        <p className="mt-2 text-sm text-slate-600">Your recording is stored privately. Only your signed-in session can request a temporary playback link.</p>
        {recordingUrl ? (
          <>
            <video
              ref={videoRef}
              controls
              playsInline
              preload="metadata"
              src={recordingUrl}
              aria-label="Saved practice recording"
              className="mt-6 aspect-video w-full rounded-xl bg-slate-950"
              onLoadedMetadata={(event) => {
                const loaded = event.currentTarget.duration;
                if (Number.isFinite(loaded) && loaded > 0) setMediaDuration(loaded);
                setMediaReady(true);
                setPlaybackError(false);
              }}
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
              onError={() => { setPlaybackError(true); setMediaReady(false); }}
            />
            {playbackError && <p role="alert" className="mt-3 text-sm text-rose-700">Playback is unavailable. Refresh this page to request a new link.</p>}
          </>
        ) : <p role="alert" className="mt-5 text-sm text-rose-700">Playback is unavailable right now. Refresh this page to try again.</p>}
        <Timeline events={events} duration={duration} currentTime={currentTime} canSeek={canSeek} onSeek={seekTo} />
      </section>

      {job.transcript && <Transcript transcript={job.transcript} onSeek={canSeek ? seekTo : undefined} currentTime={currentTime} />}
      {job.metrics && <SpeechMetrics metrics={job.metrics} />}
      <VisionReport feedback={job.vision_feedback} sessionId={session.id} />
      {analysis && <LanguageFeedback analysis={analysis} onSeek={canSeek ? seekTo : undefined} />}
      {job.metrics && !analysis && (
        <section aria-labelledby="language-unavailable-heading" className="rounded-2xl border border-sky-200 bg-sky-50 p-7">
          <h2 id="language-unavailable-heading" className="text-xl font-semibold text-sky-950">English language feedback</h2>
          <p className="mt-2 text-sm text-sky-900">{job.language_feedback?.status === "unavailable" && job.language_feedback.reason === "no_speech" ? "No recognizable speech was found to review." : job.language_feedback?.status === "unavailable" && job.language_feedback.reason === "provider_error" ? "The language coach could not produce reliable feedback this time. Your transcript and speech metrics are saved." : "Language coaching is not enabled on this server yet. Your transcript and speech metrics are saved."}</p>
          {!(job.language_feedback?.status === "unavailable" && job.language_feedback.reason === "no_speech") && <form action={`/sessions/${session.id}/analysis`} method="post" className="mt-5"><button type="submit" className="rounded-xl bg-sky-800 px-6 py-3 font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800">{job.language_feedback?.status === "unavailable" && job.language_feedback.reason === "provider_error" ? "Retry language feedback" : "Analyze saved transcript"}</button></form>}
        </section>
      )}
      {job.report && <MockReport report={job.report} />}
      {!job.metrics && (
        <section aria-labelledby="upgrade-transcript-heading" className="rounded-2xl border border-sky-200 bg-sky-50 p-7">
          <h2 id="upgrade-transcript-heading" className="text-xl font-semibold text-sky-950">Measure this saved recording</h2>
          <p className="mt-2 text-sm text-sky-900">This earlier session can receive real speaking pace, pause, hesitation, and repetition metrics.</p>
          <form action={`/sessions/${session.id}/analysis`} method="post" className="mt-5"><button type="submit" className="rounded-xl bg-sky-800 px-6 py-3 font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800">Measure saved recording</button></form>
        </section>
      )}
    </section>
  );
}
