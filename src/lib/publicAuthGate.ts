/**
 * Browse vs phone-verified checks.
 * Guest JWT may browse; booking/auth actions require phone OTP via in-app dialog.
 */

import { deleteCookie, readCookie } from "./authCookies";
import {
  clearGuestSession,
  GUEST_MODE_ENABLED,
  hasGuestSession,
  rememberAuthReturn
} from "./guestSession";
import {
  isPublicAuthTokenValid,
  PUBLIC_AUTH_COOKIE_NAME,
  resolvePublicAuthToken
} from "./publicAuthToken";

/** Homepage views that must use phone OTP for guests. */
export const AUTH_REQUIRED_VIEWS: ReadonlySet<string> = new Set([
  "booking",
  "payment",
  "payResult",
  "addPatient",
  "addAddress",
  "editUser",
  "patient",
  "address",
  "reminderSetting",
  "notif",
  "mainLiad",
  "centerOffers",
  "staffs",
  "staff",
  "visitBooking"
]);

export type PhoneVerifyOpenRequest = {
  onVerified?: () => void;
  message?: string;
};

type PhoneVerifyOpener = (request: PhoneVerifyOpenRequest) => void;

let phoneVerifyOpener: PhoneVerifyOpener | null = null;

/** Registered by `PhoneVerifyDialog` on mount. */
export function registerPhoneVerifyOpener(opener: PhoneVerifyOpener | null): void {
  phoneVerifyOpener = opener;
}

/**
 * Valid public JWT — enough to open `/home`.
 *
 * While guest mode is off, a leftover `sayban_guest_session` marker must not
 * treat a still-valid JWT as logged-out. Plasmic OTP writes the cookie without
 * always clearing that marker; treating it as unverified sent users to `/login`,
 * which then called `clearPublicSession()` and wiped the JWT.
 */
export function hasVerifiedPublicAuth(
  cookieToken?: string | null
): boolean {
  const raw =
    cookieToken !== undefined && cookieToken !== null
      ? cookieToken
      : readCookie(PUBLIC_AUTH_COOKIE_NAME);
  if (!isPublicAuthTokenValid(raw)) return false;
  if (!GUEST_MODE_ENABLED && hasGuestSession()) {
    clearGuestSession();
  }
  return true;
}

/**
 * Phone-verified session: valid JWT and guest marker cleared after OTP.
 * Guest `users/guest` JWT alone is not enough for reservation.
 */
export function hasPhoneVerifiedPublicAuth(
  cookieToken?: string | null
): boolean {
  return hasVerifiedPublicAuth(cookieToken) && !hasGuestSession();
}

/**
 * Drop public JWT cookie + guest browse marker (localStorage).
 * Safe to call on logout and when clearing a bad/expired session.
 */
export function clearPublicSession(): void {
  deleteCookie(PUBLIC_AUTH_COOKIE_NAME);
  clearGuestSession();
}

/**
 * Drop an empty/malformed/expired public token cookie so the next login is clean.
 */
export function clearInvalidPublicAuth(): void {
  const raw = readCookie(PUBLIC_AUTH_COOKIE_NAME);
  if (!raw) {
    clearGuestSession();
    return;
  }
  if (!isPublicAuthTokenValid(raw)) {
    clearPublicSession();
  }
}

/**
 * Public logout: clear token + guest flag, then hard-navigate to login so
 * in-memory Plasmic `$state.token` cannot survive a soft route change.
 * Cookie domain is host-aware (`.darkube.ir` / `.sayban.app`) via deleteCookie.
 */
export function logoutPublic(loginPath: string = "/login"): void {
  clearPublicSession();
  if (typeof window === "undefined") return;
  window.location.replace(loginPath);
}

/** Guest browse session still active (localStorage). */
export function isGuestOnly(): boolean {
  return hasGuestSession();
}

export function canBrowsePublicApp(): boolean {
  return hasVerifiedPublicAuth();
}

export function activeViewsRequireVerifiedAuth(
  views: ReadonlySet<string> | Iterable<string>
): boolean {
  const list = Array.from(views);
  for (let i = 0; i < list.length; i += 1) {
    if (AUTH_REQUIRED_VIEWS.has(list[i])) return true;
  }
  return false;
}

/**
 * Continue only after phone OTP.
 * Opens the in-app dialog (same users/auth + validate APIs) — no /login/mobile redirect.
 */
export function ensureVerifiedPublicAuth(options?: {
  returnPath?: string;
  onVerified?: () => void;
  message?: string;
}): boolean {
  if (hasPhoneVerifiedPublicAuth()) {
    options?.onVerified?.();
    return true;
  }
  if (typeof window === "undefined") return false;
  if (!hasVerifiedPublicAuth()) {
    clearInvalidPublicAuth();
  }
  if (options?.returnPath) {
    rememberAuthReturn(options.returnPath);
  }
  if (phoneVerifyOpener) {
    phoneVerifyOpener({
      onVerified: options?.onVerified,
      message: options?.message
    });
  } else {
    // Fallback before dialog host mounts — still avoid hard navigation when possible.
    console.warn("[sayban] PhoneVerifyDialog host is not mounted");
  }
  return false;
}

/** Re-entry when `/home` has no usable public token (auto-guest or mobile). */
export function redirectToNameLogin(options?: {
  returnPath?: string;
  replace?: boolean;
}): void {
  if (typeof window === "undefined") return;
  clearInvalidPublicAuth();
  if (options?.returnPath) rememberAuthReturn(options.returnPath);
  const dest = "/login";
  if (options?.replace === false) {
    window.location.assign(dest);
  } else {
    window.location.replace(dest);
  }
}

export { resolvePublicAuthToken, isPublicAuthTokenValid };
