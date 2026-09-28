import Link from "next/link";
import { redirect } from "next/navigation";
import { getBackendIdentity } from "@/lib/backend";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listPracticeSessions, practiceTypes } from "@/lib/sessions";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!getSupabaseConfig()) {
    redirect("/auth/sign-in?error=not-configured");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) {
    redirect("/auth/sign-in");
  }

  const userId = data.claims.sub;
  const email =
    typeof data.claims.email === "string" ? data.claims.email : "Your account";
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const backendUser = token ? await getBackendIdentity(token) : null;
  const backendVerified = backendUser?.id === userId;
  const sessions = backendVerified && token ? await listPracticeSessions(token) : null;
  const { error: pageError } = await searchParams;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-8 sm:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <Link href="/" className="text-lg font-semibold text-slate-900">
          English Coach
        </Link>
        <form action="/auth/sign-out" method="post">
          <button
            type="submit"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800"
          >
            Sign out
          </button>
        </form>
      </header>

      <div className="py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
          Your dashboard
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
          Welcome back
        </h1>
        <p className="mt-3 text-slate-600">Signed in as {email}</p>

        {pageError === "sign-out-failed" && (
          <p className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">
            Sign out failed. Please try again.
          </p>
        )}

        {pageError === "delete-failed" && (
          <p className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">
            The session could not be deleted. Please try again.
          </p>
        )}

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Practice sessions</h2>
              <p className="mt-1 text-sm text-slate-600">Choose a topic and build your practice history.</p>
            </div>
            <Link
              href="/sessions/new"
              className="inline-flex rounded-xl bg-sky-800 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800"
            >
              Start practice
            </Link>
          </div>
          {sessions === null ? (
            <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900" role="status">
              Session history is unavailable. Check the API connection and refresh.
            </p>
          ) : sessions.length === 0 ? (
            <p className="mt-6 rounded-xl bg-slate-50 p-6 text-slate-600">
              No sessions yet. Start with a topic you enjoy talking about.
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-slate-200">
              {sessions.map((session) => (
                <li key={session.id}>
                  <Link href={`/sessions/${session.id}`} className="flex flex-wrap items-center justify-between gap-3 py-4 hover:text-sky-800">
                    <span>
                      <span className="block font-semibold text-slate-900">{session.topic}</span>
                      <span className="mt-1 block text-sm text-slate-600">
                        {practiceTypes.find((type) => type.value === session.practice_type)?.label ?? "Practice"}
                        {" · "}
                        {new Date(session.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                      {session.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Account connection</h2>
            <p className="mt-3 flex items-center gap-2 text-slate-700" role="status">
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 rounded-full ${backendVerified ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              {backendVerified
                ? "Identity verified by the API"
                : "API identity check unavailable"}
            </p>
        </section>
      </div>
    </main>
  );
}
