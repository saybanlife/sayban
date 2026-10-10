/**
 * Host-aware cookie helpers for the auth cookies.
 *
 * Hardcoded `domain=.darkube.ir; secure` is rejected on any host that is not a
 * darkube.ir subdomain (e.g. web.sayban.app) and on non-HTTPS. That made both
 * writing and deleting the auth cookie a silent no-op outside those hosts, so
 * logout never cleared anything on sayban.app.
 *
 * Supported shared parents: `.darkube.ir` (sayban-test.darkube.ir) and
 * `.sayban.app` (web.sayban.app). Cookies are never shared across those two
 * registrable domains from one browser write — each host writes/deletes for
 * its own parent.
 */

export const PANEL_AUTH_COOKIE_NAME = "panelToken";
export const PUBLIC_AUTH_COOKIE_NAME = "token";

/** Parent domains that may scope auth cookies when the page host belongs to them. */
export const SHARED_AUTH_COOKIE_DOMAINS = [".darkube.ir", ".sayban.app"] as const;

/**
 * Domains a cookie may legitimately be scoped to on `hostname`, most specific
 * first. Always ends with `undefined` (host-only) so deletes clear both shared
 * and host-scoped copies. A leading-dot domain is only accepted when the host
 * actually belongs to it.
 */
export function authCookieDomainsForHost(
  hostname: string
): (string | undefined)[] {
  const host = String(hostname || "")
    .trim()
    .toLowerCase();
  if (!host) return [undefined];
  for (const domain of SHARED_AUTH_COOKIE_DOMAINS) {
    const bare = domain.slice(1);
    if (host === bare || host.endsWith(domain)) {
      return [domain, undefined];
    }
  }
  return [undefined];
}

function candidateDomains(): (string | undefined)[] {
  if (typeof window === "undefined") return [undefined];
  return authCookieDomainsForHost(window.location.hostname);
}

function secureSuffix(): string {
  if (typeof window === "undefined") return "";
  return window.location.protocol === "https:" ? "; secure" : "";
}

export function writeCookie(name: string, value: string, days = 7): void {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const domain = candidateDomains()[0];
  document.cookie = [
    `${name}=${encodeURIComponent(value)}`,
    `expires=${expires}`,
    "path=/",
    domain ? `domain=${domain}` : "",
    "SameSite=Lax"
  ]
    .filter(Boolean)
    .join("; ")
    .concat(secureSuffix());
}

export function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  const row = document.cookie
    .split("; ")
    .find(entry => entry.startsWith(prefix));
  if (!row) return null;
  // `slice` rather than split("="), so padded JWTs are not truncated.
  const raw = row.slice(prefix.length);
  try {
    return decodeURIComponent(raw) || null;
  } catch {
    return raw || null;
  }
}

/**
 * Expire a cookie across every domain scope it could have been written under.
 * A delete only takes effect when domain and path match the original write, so
 * we retry each candidate instead of guessing.
 */
export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  const past = "Thu, 01 Jan 1970 00:00:00 GMT";
  for (const domain of candidateDomains()) {
    document.cookie = [
      `${name}=`,
      `expires=${past}`,
      "max-age=0",
      "path=/",
      domain ? `domain=${domain}` : "",
      "SameSite=Lax"
    ]
      .filter(Boolean)
      .join("; ")
      .concat(secureSuffix());
  }
}
