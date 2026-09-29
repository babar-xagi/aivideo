import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <main id="main-content" tabIndex={-1} className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 sm:px-6">
      <h1 className="text-3xl font-semibold text-slate-950">Check your email</h1>
      <p className="mt-4 leading-7 text-slate-600">
        If email confirmation is enabled for this project, open the link we sent
        you. Then return to sign in.
      </p>
      <Link href="/auth/sign-in" className="mt-8 font-semibold text-sky-800 hover:underline">
        Go to sign in
      </Link>
    </main>
  );
}
