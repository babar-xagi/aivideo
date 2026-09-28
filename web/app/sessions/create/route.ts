import { type NextRequest, NextResponse } from "next/server";
import { createPracticeSession, practiceTypes } from "@/lib/sessions";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseRouteClient, isSameOrigin, publicRedirectUrl } from "@/lib/supabase/route";

export async function POST(request: NextRequest) {
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

  const form = await request.formData();
  const topic = form.get("topic");
  const practiceType = form.get("practice_type");
  if (
    typeof topic !== "string" || !topic.trim() || topic.trim().length > 200 ||
    typeof practiceType !== "string" ||
    !practiceTypes.some((type) => type.value === practiceType)
  ) {
    return redirectTo("/sessions/new?error=invalid-input");
  }

  const created = await createPracticeSession(token, {
    topic: topic.trim(),
    practice_type: practiceType,
  });
  return redirectTo(created ? `/sessions/${created.id}` : "/sessions/new?error=create-failed");
}
