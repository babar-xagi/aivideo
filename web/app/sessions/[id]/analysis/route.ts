import { type NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";
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
  try {
    const response = await fetch(
      new URL(`/api/sessions/${encodeURIComponent(id)}/analysis`, getBackendUrl()),
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    return redirectTo(response.ok ? `/sessions/${id}` : `/sessions/${id}?error=analysis-failed`);
  } catch {
    return redirectTo(`/sessions/${id}?error=analysis-failed`);
  }
}
