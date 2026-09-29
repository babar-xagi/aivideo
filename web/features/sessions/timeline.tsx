import type { LanguageFeedback, SpeechMetrics } from "@/lib/sessions";

export type TimelineEvent = {
  id: string;
  kind: "hesitation" | "pause" | "repetition" | "grammar" | "clarity" | "vocabulary";
  time: number;
  label: string;
};

const markerStyles: Record<TimelineEvent["kind"], string> = {
  hesitation: "bg-amber-500 focus-visible:outline-amber-700",
  pause: "bg-violet-600 focus-visible:outline-violet-700",
  repetition: "bg-orange-600 focus-visible:outline-orange-700",
  grammar: "bg-rose-600 focus-visible:outline-rose-700",
  clarity: "bg-sky-600 focus-visible:outline-sky-700",
  vocabulary: "bg-emerald-600 focus-visible:outline-emerald-700",
};

export function formatTime(seconds: number): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  return `${Math.floor(safe / 60)}:${Math.floor(safe % 60).toString().padStart(2, "0")}`;
}

export function buildTimelineEvents(
  metrics: SpeechMetrics | null,
  feedback: LanguageFeedback | null,
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  metrics?.fillers.forEach((item, index) => events.push({ id: `filler-${index}`, kind: "hesitation", time: item.start, label: `Hesitation: ${item.word}` }));
  metrics?.pauses.filter((item) => item.duration >= 2).forEach((item, index) => events.push({ id: `pause-${index}`, kind: "pause", time: item.start, label: `Long pause: ${item.duration.toFixed(1)} seconds` }));
  metrics?.repetitions.forEach((item, index) => events.push({ id: `repeat-${index}`, kind: "repetition", time: item.start, label: `Repeated word: ${item.word}` }));
  if (feedback?.status === "available") {
    feedback.analysis.grammar_issues.forEach((item, index) => events.push({ id: `grammar-${index}`, kind: "grammar", time: item.timestamp_start, label: `Grammar: ${item.original}` }));
    feedback.analysis.clarity_suggestions.forEach((item, index) => events.push({ id: `clarity-${index}`, kind: "clarity", time: item.timestamp_start, label: `Clarity: ${item.original}` }));
    feedback.analysis.vocabulary_suggestions.forEach((item, index) => events.push({ id: `vocabulary-${index}`, kind: "vocabulary", time: item.timestamp_start, label: `Vocabulary: ${item.original}` }));
  }
  return events.filter((event) => Number.isFinite(event.time) && event.time >= 0).sort((a, b) => a.time - b.time);
}

export function Timeline({
  events,
  duration,
  currentTime,
  canSeek,
  onSeek,
}: {
  events: TimelineEvent[];
  duration: number;
  currentTime: number;
  canSeek: boolean;
  onSeek: (seconds: number) => void;
}) {
  const safeDuration = Math.max(1, duration);
  const position = (seconds: number) => `${Math.min(100, Math.max(0, (seconds / safeDuration) * 100))}%`;

  return (
    <section aria-labelledby="timeline-heading" className="mt-7 border-t border-slate-200 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="timeline-heading" className="font-semibold text-slate-950">Recording timeline</h3>
        <span className="text-xs text-slate-500">{canSeek ? "Select a marker to jump to that moment" : "Markers activate when playback is ready"}</span>
      </div>
      <div className="relative mx-6 mt-5 h-11" role="group" aria-label="Timed recording events">
        <div className="absolute inset-x-0 top-4 h-2 rounded-full bg-slate-200" aria-hidden="true" />
        <div className="absolute top-2 h-6 w-0.5 bg-slate-950" style={{ left: position(currentTime) }} aria-hidden="true" />
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            disabled={!canSeek}
            onClick={() => onSeek(event.time)}
            aria-label={`Jump to ${formatTime(event.time)} — ${event.label}`}
            title={`${formatTime(event.time)} · ${event.label}`}
            style={{ left: position(event.time) }}
            className="absolute top-0 z-10 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
          ><span className={`h-6 w-2 rounded-full ring-2 ring-white ${markerStyles[event.kind]}`} aria-hidden="true" /></button>
        ))}
      </div>
      <div className="flex justify-between text-xs tabular-nums text-slate-500"><span>0:00</span><span>{formatTime(duration)}</span></div>
      {events.length === 0 ? <p className="mt-5 text-sm text-slate-600">No timed coaching events were found for this recording.</p> : (
        <>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Timeline legend">
            {[...new Set(events.map((event) => event.kind))].map((kind) => <li key={kind} className="flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs capitalize text-slate-700"><span className={`h-2.5 w-2.5 rounded-full ${markerStyles[kind]}`} aria-hidden="true" />{kind}</li>)}
          </ul>
          <ol className="mt-5 grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2" aria-label="Timed event list">
            {events.map((event) => <li key={event.id}><button type="button" disabled={!canSeek} onClick={() => onSeek(event.time)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-50"><span className="font-semibold tabular-nums text-sky-900">{formatTime(event.time)}</span><span className="ml-2">{event.label}</span></button></li>)}
          </ol>
        </>
      )}
    </section>
  );
}
