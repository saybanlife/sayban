/**
 * Guest browse marker (default name «کاربر مهمان»). Verified identity stays
 * the JWT cookie from OTP (`users/validate` → `token`) after upgrade.
 */

export const GUEST_SESSION_STORAGE_KEY = "sayban_guest_session";
export const AUTH_RETURN_STORAGE_KEY = "sayban_auth_return";

export type GuestSession = {
  name: string;
  createdAt: number;
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function canUseSessionStorage(): boolean {
  return (
    typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
  );
}

export function normalizeGuestName(raw: string): string {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

export function readGuestSession(): GuestSession | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(GUEST_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuestSession>;
    const name = normalizeGuestName(String(parsed?.name || ""));
    if (!name) return null;
    return {
      name,
      createdAt:
        typeof parsed.createdAt === "number" && Number.isFinite(parsed.createdAt)
          ? parsed.createdAt
          : Date.now()
    };
  } catch {
    return null;
  }
}

export function writeGuestSession(nameInput: string): GuestSession | null {
  if (!canUseStorage()) return null;
  const name = normalizeGuestName(nameInput);
  if (!name) return null;
  const session: GuestSession = { name, createdAt: Date.now() };
  try {
    window.localStorage.setItem(GUEST_SESSION_STORAGE_KEY, JSON.stringify(session));
    return session;
  } catch {
    return null;
  }
}

export function clearGuestSession(): void {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function hasGuestSession(): boolean {
  return Boolean(readGuestSession());
}

export function rememberAuthReturn(path: string): void {
  if (!canUseSessionStorage()) return;
  const clean = String(path || "").trim();
  if (!clean || clean.startsWith("/login")) return;
  try {
    window.sessionStorage.setItem(AUTH_RETURN_STORAGE_KEY, clean);
  } catch {
    // ignore
  }
}

export function peekAuthReturn(): string | null {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(AUTH_RETURN_STORAGE_KEY);
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

export function consumeAuthReturn(): string | null {
  const value = peekAuthReturn();
  if (!canUseSessionStorage()) return value;
  try {
    window.sessionStorage.removeItem(AUTH_RETURN_STORAGE_KEY);
  } catch {
    // ignore
  }
  return value;
}
