"use client";

import Link from "next/link";

export default function SessionError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main-content" className="mx-auto min-h-screen w-full max-w-xl px-4 py-20 sm:px-10">
    <h1 className="text-3xl font-semibold text-slate-950">Session could not load</h1>
    <p className="mt-3 text-slate-600">Check your connection and try again. Your saved recording and report remain in your account.</p>
    <div className="mt-6 flex flex-wrap gap-3">
      <button type="button" onClick={reset} className="rounded-xl bg-sky-800 px-5 py-3 font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800">Try again</button>
      <Link href="/dashboard" className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-800 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800">Back to dashboard</Link>
    </div>
  </main>;
}
