import type { Transcript as TranscriptType } from "@/lib/sessions";

function timestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

export function Transcript({
  transcript,
  onSeek,
  currentTime,
}: {
  transcript: TranscriptType;
  onSeek?: (seconds: number) => void;
  currentTime?: number;
}) {
  return (
    <section aria-labelledby="transcript-heading" className="mt-8 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="transcript-heading" className="text-xl font-semibold text-slate-900">Your transcript</h2>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">Transcribed from your recording</span>
      </div>
      <p className="mt-2 text-sm text-slate-600">English speech recognition can make mistakes. Check the recording before relying on a phrase.{onSeek ? " Select a timestamp to jump to it." : ""}</p>
      {transcript.segments.length === 0 ? (
        <p className="mt-6 text-slate-600">No speech was detected in this recording.</p>
      ) : (
        <ol className="mt-6 divide-y divide-slate-200">
          {transcript.segments.map((segment, index) => (
            <li key={`${segment.start}-${index}`} className={`grid gap-2 rounded-lg px-2 py-4 sm:grid-cols-[8rem_1fr] ${currentTime !== undefined && currentTime >= segment.start && currentTime < segment.end ? "bg-sky-50" : ""}`}>
              {onSeek ? (
                <button type="button" onClick={() => onSeek(segment.start)} aria-label={`Jump to ${timestamp(segment.start)} — ${segment.text}`} className="w-fit self-start text-left text-sm font-semibold tabular-nums text-sky-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800">{timestamp(segment.start)}–{timestamp(segment.end)}</button>
              ) : (
                <span className="text-sm font-semibold tabular-nums text-sky-800">{timestamp(segment.start)}–{timestamp(segment.end)}</span>
              )}
              <p className="leading-6 text-slate-800">{segment.text}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
