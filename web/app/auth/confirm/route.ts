import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseRouteClient, publicRedirectUrl } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const destination = publicRedirectUrl(
    request,
    "/auth/sign-in?error=confirmation-failed",
  );

  if (!tokenHash || !getSupabaseConfig()) {
    return NextResponse.redirect(destination);
  }

  const { supabase, redirectTo } = createSupabaseRouteClient(request);
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "email",
  });

  if (error) {
    return redirectTo("/auth/sign-in?error=confirmation-failed");
  }

  return redirectTo("/dashboard");
}
