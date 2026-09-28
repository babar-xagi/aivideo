import { type NextRequest, NextResponse } from "next/server";
import { readCredentials } from "@/features/auth/credentials";
import { getSupabaseConfig } from "@/lib/supabase/config";
import {
  createSupabaseRouteClient,
  isSameOrigin,
  publicRedirectUrl,
} from "@/lib/supabase/route";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  if (!getSupabaseConfig()) {
    return NextResponse.redirect(
      publicRedirectUrl(request, "/auth/sign-in?error=not-configured"),
      303,
    );
  }

  const credentials = readCredentials(await request.formData(), 1);
  const { supabase, redirectTo } = createSupabaseRouteClient(request);
  if (!credentials) {
    return redirectTo("/auth/sign-in?error=invalid-input");
  }

  const { error } = await supabase.auth.signInWithPassword(credentials);
  return redirectTo(error ? "/auth/sign-in?error=invalid-login" : "/dashboard");
}
