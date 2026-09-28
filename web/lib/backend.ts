type BackendHealth = { status: "connected" | "unavailable" };
type BackendIdentity = { id: string; email: string | null };

export function getBackendUrl(): string {
  return process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
}

export async function getBackendHealth(): Promise<BackendHealth> {
  try {
    const response = await fetch(new URL("/health", getBackendUrl()), {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { status: "unavailable" };
    }

    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "status" in body &&
      body.status === "ok" &&
      "database" in body &&
      body.database === "connected"
    ) {
      return { status: "connected" };
    }
  } catch {
    // The page stays available while the API or database is starting.
  }

  return { status: "unavailable" };
}

export async function getBackendIdentity(
  accessToken: string,
): Promise<BackendIdentity | null> {
  try {
    const response = await fetch(new URL("/api/me", getBackendUrl()), {
      cache: "no-store",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      return null;
    }

    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "id" in body &&
      typeof body.id === "string" &&
      "email" in body &&
      (typeof body.email === "string" || body.email === null)
    ) {
      return { id: body.id, email: body.email };
    }
  } catch {
    // A failed API identity check never grants access to user data.
  }

  return null;
}
