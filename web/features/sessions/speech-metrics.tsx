import type { SpeechMetrics as SpeechMetricsData } from "@/lib/sessions";

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

export function SpeechMetrics({ metrics }: { metrics: SpeechMetricsData }) {
  return (
    <section aria-labelledby="speech-metrics-heading" className="mt-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
      <h2 id="speech-metrics-heading" className="text-xl font-semibold text-slate-900">Your speaking metrics</h2>
      <p className="mt-2 text-sm text-slate-600">Estimated from recognized English words and their timestamps. Review the transcript for recognition errors.</p>
      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Recognized words" value={metrics.total_words} />
        <Metric label="Words per minute" value={metrics.words_per_minute ?? "—"} />
        <Metric label="Pauses at least 0.5 s" value={metrics.pause_count} />
        <Metric label="Average pause" value={metrics.average_pause_seconds === null ? "—" : `${metrics.average_pause_seconds} s`} />
        <Metric label="Long pauses at least 2 s" value={metrics.long_pause_count} />
        <Metric label="Hesitation words" value={metrics.filler_count} />
        <Metric label="Hesitations per 100 words" value={metrics.filler_frequency_per_100_words ?? "—"} />
        <Metric label="Immediate repeated words" value={metrics.repetition_count} />
      </dl>
      <p className="mt-5 text-xs text-slate-500">Pace uses the time from the first recognized word to the last, including pauses between them. Hesitations count “um,” “uh,” “erm,” and “hmm.” Context dependent words such as “like” are excluded.</p>
      {(metrics.fillers.length > 0 || metrics.repetitions.length > 0) && (
        <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          {metrics.fillers.length > 0 && <p><span className="font-semibold text-slate-900">Hesitations:</span> {metrics.fillers.map((item) => `${item.word} (${item.start.toFixed(1)}s)`).join(", ")}</p>}
          {metrics.repetitions.length > 0 && <p><span className="font-semibold text-slate-900">Repeated words:</span> {metrics.repetitions.map((item) => `${item.word} (${item.start.toFixed(1)}s)`).join(", ")}</p>}
        </div>
      )}
    </section>
  );
}
