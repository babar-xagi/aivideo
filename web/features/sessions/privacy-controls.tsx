import type { PracticeSession } from "@/lib/sessions";

export function PrivacyControls({ session }: { session: PracticeSession }) {
  const busy = session.status === "queued" || session.status === "processing";
  return (
    <section aria-labelledby="privacy-heading" className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 id="privacy-heading" className="text-xl font-semibold text-slate-950">Your recording and privacy</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">Your recording stays in private storage. The app saves your transcript, report, and aggregate measurements with this session. Language coaching sends transcript text and speech metrics to OpenAI only when a server key is configured; it does not send audio or video.</p>
      <div className="mt-6 rounded-xl bg-slate-50 p-4">
        <h3 className="font-semibold text-slate-900">Video movement analysis</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{session.vision_enabled ? "Enabled. The worker samples video frames for face, hand, and body landmarks. Turn this off to remove saved video measurements and skip them in future analyses." : "Disabled. Video frames will not be analyzed. Turn this on and run analysis to add video measurements."}</p>
        {busy ? <p className="mt-3 text-sm text-slate-600">This setting can be changed when the current analysis finishes.</p> : (
          <form action={`/sessions/${session.id}/privacy`} method="post" className="mt-4">
            <input type="hidden" name="enabled" value={session.vision_enabled ? "false" : "true"} />
            <button type="submit" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800">{session.vision_enabled ? "Turn off video analysis" : "Turn on video analysis"}</button>
          </form>
        )}
      </div>
      <details className="mt-6 rounded-xl border border-rose-200 p-4">
        <summary className="cursor-pointer font-semibold text-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700">Delete this session</summary>
        <p className="mt-3 text-sm leading-6 text-slate-700">This permanently deletes the saved recording, transcript, report, and measurements. It cannot be undone.</p>
        <form action={`/sessions/${session.id}/delete`} method="post" className="mt-4 space-y-4">
          <label className="flex items-start gap-3 text-sm text-slate-800"><input type="checkbox" name="confirm" value="delete" required className="mt-1 h-4 w-4 accent-rose-700" />I understand that this session and its recording will be deleted.</label>
          <button type="submit" className="rounded-xl bg-rose-700 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700">Delete session permanently</button>
        </form>
      </details>
    </section>
  );
}
