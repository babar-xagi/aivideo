import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "./config";

export function createSupabaseRouteClient(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase Auth is not configured");
  }

  const cookiesToWrite: Array<{
    name: string;
    value: string;
    options?: Parameters<NextResponse["cookies"]["set"]>[2];
  }> = [];

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToWrite.push(...cookiesToSet);
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
      },
    },
  });

  function withCookies(response: NextResponse) {
    cookiesToWrite.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  function redirectTo(path: string) {
    return withCookies(NextResponse.redirect(publicRedirectUrl(request, path), 303));
  }

  return { supabase, redirectTo, withCookies };
}

export function publicRedirectUrl(request: NextRequest, path: string): URL {
  const host = request.headers.get("host");
  if (!host) {
    throw new Error("Request Host header is missing");
  }
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const protocol =
    forwardedProtocol === "https" || forwardedProtocol === "http"
      ? forwardedProtocol
      : request.nextUrl.protocol.replace(":", "");
  return new URL(path, `${protocol}://${host}`);
}

export function isSameOrigin(request: NextRequest): boolean {
  if (!request.headers.get("host")) {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin || origin === "null") {
    return request.headers.get("sec-fetch-site") === "same-origin";
  }

  try {
    const requestOrigin = new URL(origin).origin;
    return (
      requestOrigin === request.nextUrl.origin ||
      requestOrigin === publicRedirectUrl(request, "/").origin
    );
  } catch {
    return false;
  }
}
