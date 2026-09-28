import { type NextRequest, NextResponse } from "next/server";
import { deletePracticeSession } from "@/lib/sessions";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseRouteClient, isSameOrigin, publicRedirectUrl } from "@/lib/supabase/route";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(request)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  if (!getSupabaseConfig()) {
    return NextResponse.redirect(publicRedirectUrl(request, "/auth/sign-in?error=not-configured"), 303);
  }
  const { supabase, redirectTo } = createSupabaseRouteClient(request);
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) {
    return redirectTo("/auth/sign-in");
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    return redirectTo("/auth/sign-in");
  }
  const { id } = await params;
  const deleted = await deletePracticeSession(token, id);
  return redirectTo(deleted ? "/dashboard" : "/dashboard?error=delete-failed");
}
