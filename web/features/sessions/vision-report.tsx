import type { VisionFeedback } from "@/lib/sessions";

function Percentage({ label, value }: { label: string; value: number | null }) {
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><dt className="text-sm text-slate-600">{label}</dt><dd className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">{value === null ? "—" : `${value}%`}</dd></div>;
}

export function VisionReport({ feedback, sessionId }: { feedback: VisionFeedback | null; sessionId: string }) {
  const available = feedback?.status === "available";
  return (
    <section aria-labelledby="vision-heading" className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Video measurements</p>
      <h2 id="vision-heading" className="mt-2 text-2xl font-semibold text-slate-950">Visible movement</h2>
      {available ? <>
        <p className="mt-3 text-sm leading-6 text-slate-600">MediaPipe sampled {feedback.sampled_frames} frames about every {feedback.sample_interval_seconds} seconds. These estimates describe visible landmarks only; they cannot measure eye contact, confidence, or presentation quality.</p>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Percentage label="Head approximately toward camera" value={feedback.facing_camera_percent} />
          <Percentage label="Hands visible in sampled frames" value={feedback.hands_visible_percent} />
          <Percentage label="Torso position changed between samples" value={feedback.body_movement_percent} />
        </dl>
        <div className="mt-6 rounded-xl bg-slate-50 p-5">
          <h3 className="font-semibold text-slate-900">Head orientation in detected face frames</h3>
          <p className="mt-2 text-sm text-slate-600">Image left: {feedback.head_left_percent ?? "—"}% · Near center: {feedback.head_center_percent ?? "—"}% · Image right: {feedback.head_right_percent ?? "—"}%</p>
          <p className="mt-2 text-xs text-slate-500">Face detected in {feedback.face_frames} frames; body pose in {feedback.pose_frames}; hands in {feedback.hand_frames}. Missing detections are excluded from head orientation and movement percentages.</p>
        </div>
      </> : <>
        <p className="mt-3 text-sm leading-6 text-slate-600">{feedback?.reason === "no_person" ? "No reliable face, hand, or body landmarks were found in the sampled frames. Try brighter lighting and keeping your upper body in view for a future recording." : feedback?.reason === "decode_error" ? "The saved video could not be measured this time. Speech results are still available." : feedback?.reason === "runtime_missing" ? "The video runtime is missing a Linux library. Speech results are still available." : feedback?.reason === "models_missing" ? "Video models are not installed on this server yet. Speech results are still available." : "This earlier report has no video measurements yet."}</p>
        {feedback?.reason !== "no_person" && <form action={`/sessions/${sessionId}/analysis`} method="post" className="mt-5"><button type="submit" className="rounded-xl bg-sky-800 px-5 py-3 font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800">Measure saved video</button></form>}
      </>}
    </section>
  );
}
