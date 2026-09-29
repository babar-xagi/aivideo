export default function DashboardLoading() {
  return (
    <main id="main-content" className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-10" role="status" aria-live="polite">
      <p className="text-sm font-semibold text-sky-800">Loading your practice sessions…</p>
      <div aria-hidden="true" className="mt-12 space-y-5 motion-safe:animate-pulse">
        <div className="h-10 w-48 max-w-full rounded-lg bg-slate-200" />
        <div className="h-32 rounded-2xl bg-slate-200" />
        <div className="h-32 rounded-2xl bg-slate-200" />
      </div>
    </main>
  );
}
