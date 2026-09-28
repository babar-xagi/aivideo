import { type NextRequest, NextResponse } from "next/server";
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
    return NextResponse.redirect(publicRedirectUrl(request, "/"), 303);
  }

  const { supabase, redirectTo } = createSupabaseRouteClient(request);
  const { error } = await supabase.auth.signOut({ scope: "local" });
  return redirectTo(error ? "/dashboard?error=sign-out-failed" : "/");
}
