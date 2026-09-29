import Link from "next/link";

export default function SessionNotFound() {
  return <main id="main-content" className="mx-auto min-h-screen w-full max-w-xl px-4 py-20 sm:px-10">
    <h1 className="text-3xl font-semibold text-slate-950">Session not found</h1>
    <p className="mt-3 text-slate-600">This session may have been deleted, or it may belong to another account.</p>
    <Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-sky-800 px-5 py-3 font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800">Back to dashboard</Link>
  </main>;
}
