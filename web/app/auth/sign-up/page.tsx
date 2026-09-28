import { AuthForm } from "@/features/auth/auth-form";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthForm
      mode="sign-up"
      action="/auth/sign-up/submit"
      error={error}
      configured={getSupabaseConfig() !== null}
    />
  );
}
