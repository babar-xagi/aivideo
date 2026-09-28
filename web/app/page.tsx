import { getBackendHealth } from "@/lib/backend";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const health = await getBackendHealth();
  const connected = health.status === "connected";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8 sm:px-10">
      <header className="flex items-center justify-between border-b border-slate-200 pb-6">
        <span className="text-lg font-semibold tracking-tight text-slate-900">
          English Coach
        </span>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          <Link href="/auth/sign-in" className="text-slate-700 hover:text-sky-800">
            Sign in
          </Link>
          <Link href="/dashboard" className="text-sky-800 hover:underline">
            Dashboard
          </Link>
        </nav>
      </header>

      <div className="flex flex-1 flex-col justify-center py-20">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
          A calmer way to practice
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-6xl">
          Practice English. Record yourself. Get useful feedback.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          A personal speaking coach is taking shape. Create an account, choose a
          topic, and save your practice sessions.
        </p>
        <div className="mt-8">
          <Link
            href="/auth/sign-up"
            className="inline-flex rounded-xl bg-sky-800 px-6 py-3 font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800"
          >
            Create account
          </Link>
        </div>

        <section
          aria-labelledby="connection-heading"
          className="mt-12 max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2
            id="connection-heading"
            className="text-base font-semibold text-slate-900"
          >
            Development connection
          </h2>
          <div className="mt-4 flex items-center gap-3" role="status">
            <span
              aria-hidden="true"
              className={`h-3 w-3 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`}
            />
            <span className="font-medium text-slate-800">
              {connected
                ? "Backend and database connected"
                : "Backend or database unavailable"}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {connected
              ? "The local API and database are ready."
              : "Start PostgreSQL and the FastAPI server, then refresh this page."}
          </p>
        </section>
      </div>
    </main>
  );
}
