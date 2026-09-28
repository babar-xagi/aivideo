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
      publicRedirectUrl(request, "/auth/sign-up?error=not-configured"),
      303,
    );
  }

  const credentials = readCredentials(await request.formData(), 8);
  const { supabase, redirectTo } = createSupabaseRouteClient(request);
  if (!credentials) {
    return redirectTo("/auth/sign-up?error=invalid-input");
  }

  const { data, error } = await supabase.auth.signUp(credentials);
  if (error) {
    return redirectTo("/auth/sign-up?error=sign-up-failed");
  }
  return redirectTo(data.session ? "/dashboard" : "/auth/check-email");
}
