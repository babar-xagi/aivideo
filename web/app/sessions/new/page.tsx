import Link from "next/link";
import { redirect } from "next/navigation";
import { practiceTypes } from "@/lib/sessions";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewSessionPage({
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
  const { error: pageError } = await searchParams;

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-8 sm:px-10">
      <Link href="/dashboard" className="text-sm font-semibold text-sky-800 hover:underline">
        ← Dashboard
      </Link>
      <div className="mt-14">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">New practice session</p>
        <h1 className="mt-3 text-4xl font-semibold text-slate-950">What would you like to talk about?</h1>
        <p className="mt-4 text-slate-600">Pick a practice style and give your session a topic. Then you can record and preview your speaking practice.</p>
      </div>

      <form action="/sessions/create" method="post" className="mt-10 space-y-6 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        {pageError && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            {pageError === "invalid-input"
              ? "Choose a practice style and enter a topic up to 200 characters."
              : "The session could not be created. Please try again."}
          </p>
        )}
        <div>
          <label htmlFor="practice_type" className="block text-sm font-semibold text-slate-900">Practice style</label>
          <select id="practice_type" name="practice_type" required defaultValue="free_speaking" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800">
            {practiceTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="topic" className="block text-sm font-semibold text-slate-900">Your topic</label>
          <input id="topic" name="topic" type="text" required maxLength={200} placeholder="For example, something I learned this week" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800" />
          <p className="mt-2 text-sm text-slate-500">A short prompt is enough. You can speak naturally when you start recording.</p>
        </div>
        <button type="submit" className="rounded-xl bg-sky-800 px-6 py-3 font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800">
          Create session
        </button>
      </form>
    </main>
  );
}
