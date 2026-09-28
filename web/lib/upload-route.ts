import { type NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backend";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseRouteClient, isSameOrigin } from "@/lib/supabase/route";

type UploadAction = "upload-url" | "complete-upload";

export async function forwardUploadAction(
  request: NextRequest,
  id: string,
  action: UploadAction,
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ detail: "Forbidden" }, { status: 403 });
  }
  if (!getSupabaseConfig()) {
    return NextResponse.json({ detail: "Authentication unavailable" }, { status: 503 });
  }
  const { supabase, withCookies } = createSupabaseRouteClient(request);
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) {
    return withCookies(NextResponse.json({ detail: "Sign in to continue" }, { status: 401 }));
  }
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    return withCookies(NextResponse.json({ detail: "Sign in to continue" }, { status: 401 }));
  }

  let body: string | undefined;
  if (action === "upload-url") {
    try {
      const payload: unknown = await request.json();
      if (
        typeof payload !== "object" || payload === null ||
        !("content_type" in payload) ||
        !("size_bytes" in payload) ||
        !("duration_seconds" in payload)
      ) {
        return withCookies(NextResponse.json({ detail: "Invalid recording details" }, { status: 400 }));
      }
      body = JSON.stringify(payload);
    } catch {
      return withCookies(NextResponse.json({ detail: "Invalid recording details" }, { status: 400 }));
    }
  }

  try {
    const url = new URL(
      `/api/sessions/${encodeURIComponent(id)}/${action}`,
      getBackendUrl(),
    );
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const result: unknown = await response.json();
    return withCookies(NextResponse.json(result, { status: response.status }));
  } catch {
    return withCookies(NextResponse.json({ detail: "Upload service unavailable" }, { status: 503 }));
  }
}
