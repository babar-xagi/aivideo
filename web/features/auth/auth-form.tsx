import Link from "next/link";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  action: string;
  error?: string;
  configured: boolean;
};

const errorMessages: Record<string, string> = {
  "invalid-input": "Enter a valid email and password.",
  "invalid-login": "Sign in failed. Check your email and password.",
  "sign-up-failed": "Sign up failed. Please try again.",
  "confirmation-failed": "Email confirmation failed. Request a new link or sign in.",
  "not-configured": "Authentication is not configured yet.",
};

export function AuthForm({ mode, action, error, configured }: AuthFormProps) {
  const signingUp = mode === "sign-up";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="mb-12 text-sm font-semibold text-sky-800 hover:underline">
        ← English Coach
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
        {signingUp ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-3 text-slate-600">
        {signingUp
          ? "Save your practice history as you improve."
          : "Sign in to continue your speaking practice."}
      </p>

      {!configured && (
        <p className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
          Authentication is awaiting Supabase configuration. Add the project URL
          and publishable key to <code>web/.env.local</code>.
        </p>
      )}
      {error && errorMessages[error] && configured && (
        <p className="mt-8 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">
          {errorMessages[error]}
        </p>
      )}

      <form action={action} method="post" className="mt-8 space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-800">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={!configured}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-200 disabled:bg-slate-100"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-800">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={signingUp ? "new-password" : "current-password"}
            minLength={signingUp ? 8 : 1}
            required
            disabled={!configured}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-200 disabled:bg-slate-100"
          />
          {signingUp && (
            <p className="mt-2 text-xs text-slate-500">Use at least 8 characters.</p>
          )}
        </div>
        <button
          type="submit"
          disabled={!configured}
          className="w-full rounded-xl bg-sky-800 px-5 py-3 font-semibold text-white hover:bg-sky-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {signingUp ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="mt-8 text-sm text-slate-600">
        {signingUp ? "Already have an account?" : "New here?"}{" "}
        <Link
          href={signingUp ? "/auth/sign-in" : "/auth/sign-up"}
          className="font-semibold text-sky-800 hover:underline"
        >
          {signingUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </main>
  );
}
