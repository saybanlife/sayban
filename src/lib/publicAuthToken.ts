/**
 * Public (non-panel) auth token resolution.
 *
 * TEMP: set USE_MOCK_PUBLIC_AUTH_TOKEN to `false` to restore cookie-based auth.
 * Panel routes are intentionally unaffected — they keep reading their own cookie/token.
 */
export const USE_MOCK_PUBLIC_AUTH_TOKEN = false;

export const MOCK_PUBLIC_AUTH_TOKEN =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6MjcsImV4cGlyZSI6MTc4NTQ3OTMxOH0.bHXhFR5zGJtqkfevWBu5oAZPvKv3hzhwXqSQb2zHe8A";

/** Cookie name used by Fragment.getCookie on public pages. */
export const PUBLIC_AUTH_COOKIE_NAME = "token";

/**
 * Resolve the auth token for public pages.
 * When the mock flag is on, always returns MOCK_PUBLIC_AUTH_TOKEN.
 * When off, returns the cookie value (or empty string).
 */
export function resolvePublicAuthToken(
  cookieToken?: string | null
): string {
  if (USE_MOCK_PUBLIC_AUTH_TOKEN) {
    return MOCK_PUBLIC_AUTH_TOKEN;
  }
  return cookieToken ?? "";
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = String(token || "").trim().split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json =
      typeof atob === "function"
        ? atob(padded)
        : typeof Buffer !== "undefined"
          ? Buffer.from(padded, "base64").toString("utf8")
          : "";
    if (!json) return null;
    const payload = JSON.parse(json) as Record<string, unknown>;
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

/**
 * True when the public JWT is present, parseable, and not past `expire` / `exp`.
 * Empty, malformed, or expired tokens are invalid.
 */
export function isPublicAuthTokenValid(cookieToken?: string | null): boolean {
  // TEMP mock: Plasmic Homepage onMount already trusts the mock token; keep
  // Homepage.tsx gate (`hasVerifiedPublicAuth`) consistent so /home does not
  // bounce to /login when the baked JWT `expire` is past.
  if (USE_MOCK_PUBLIC_AUTH_TOKEN) {
    return Boolean(String(resolvePublicAuthToken(cookieToken) || "").trim());
  }
  const token = String(resolvePublicAuthToken(cookieToken) || "").trim();
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  const expireRaw = payload.expire ?? payload.exp;
  if (expireRaw == null) return true;
  const expireNum = Number(expireRaw);
  if (!Number.isFinite(expireNum)) return false;
  // n8n may emit unix seconds or milliseconds; treat large values as ms.
  const expireMs = expireNum > 1e12 ? expireNum : expireNum * 1000;
  return expireMs > Date.now();
}
