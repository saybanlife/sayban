/**
 * Public-page Authorization headers — same contract as Homepage ApiRequest:
 *   { headers: { Authorization: `Bearer ${token}` } }
 *
 * Used by Fragment.apiRequest / ApiRequest so Reminder and other public calls
 * match homepage auth without relying on each Plasmic node to set config.
 */
import { readCookie } from "./authCookies";
import {
  PUBLIC_AUTH_COOKIE_NAME,
  resolvePublicAuthToken
} from "./publicAuthToken";

function stripBearer(value: string): string {
  let out = String(value || "").trim();
  while (/^Bearer\s+/i.test(out)) {
    out = out.replace(/^Bearer\s+/i, "").trim();
  }
  return out;
}

/**
 * Normalize/merge axios-style config so Authorization is always
 * `Bearer <jwt>` when a public user token is available.
 */
export function mergePublicAuthHeaders(
  config?: Record<string, any> | null,
  explicitToken?: string | null
): Record<string, any> {
  const base = config && typeof config === "object" ? { ...config } : {};
  const headers: Record<string, string> = {
    ...((base.headers && typeof base.headers === "object"
      ? base.headers
      : {}) as Record<string, string>)
  };

  const existingRaw =
    headers.Authorization ||
    headers.authorization ||
    headers.AUTHORIZATION ||
    "";
  const existingToken = stripBearer(existingRaw);
  const cookieToken = resolvePublicAuthToken(
    readCookie(PUBLIC_AUTH_COOKIE_NAME)
  );
  const propToken = stripBearer(explicitToken || "");
  const token = existingToken || propToken || cookieToken;

  if (token) {
    headers.Authorization = `Bearer ${token}`;
    delete headers.authorization;
    delete headers.AUTHORIZATION;
  }

  return { ...base, headers };
}

/** Homepage-style config object from a raw JWT / cookie token. */
export function publicBearerConfig(token?: string | null): {
  headers: { Authorization: string };
} | undefined {
  const resolved =
    stripBearer(token || "") ||
    resolvePublicAuthToken(readCookie(PUBLIC_AUTH_COOKIE_NAME));
  if (!resolved) return undefined;
  return { headers: { Authorization: `Bearer ${resolved}` } };
}
