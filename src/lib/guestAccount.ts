/**
 * Guest JWT creation + phone-upgrade helpers (shared by Login + PhoneVerifyDialog).
 */

import { writeCookie } from "./authCookies";
import { PUBLIC_ROUTES, resolveApiUrl } from "./apiRoutes";
import {
  clearGuestSession,
  writeGuestSession,
  type GuestSession
} from "./guestSession";
import { PUBLIC_AUTH_COOKIE_NAME } from "./publicAuthToken";

export const DEFAULT_GUEST_NAME = "کاربر مهمان";

const TOKEN_COOKIE_DAYS = 100;

export type GuestLoginResponse = {
  success?: boolean;
  message?: string;
  type?: string;
  data?: { token?: string } | null;
};

export function decodePublicUserId(token: string): number | null {
  try {
    const part = String(token || "").split(".")[1];
    if (!part) return null;
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(padded)) as { id?: number | string };
    const id = Number(json.id);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export async function retireGuestAccount(
  guestToken: string,
  guestId: number
): Promise<void> {
  const res = await fetch(resolveApiUrl(PUBLIC_ROUTES.usersGuestRetire), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${guestToken}`
    },
    body: JSON.stringify({ id: guestId })
  });
  const payload = (await res.json().catch(() => null)) as {
    success?: boolean;
  } | null;
  if (!res.ok || payload?.success === false) {
    throw new Error("حذف اکانت مهمان قبلی ناموفق بود.");
  }
}

/**
 * Create a default-name guest JWT + local guest marker.
 * Used for outside-app entry when no valid public token exists.
 */
export async function createDefaultGuestSession(): Promise<
  | {
      ok: true;
      token: string;
      session: GuestSession;
    }
  | {
      ok: false;
      message: string;
    }
> {
  try {
    const res = await fetch(resolveApiUrl(PUBLIC_ROUTES.usersGuest), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: DEFAULT_GUEST_NAME })
    });
    let payload: GuestLoginResponse | null = null;
    try {
      payload = (await res.json()) as GuestLoginResponse;
    } catch {
      payload = null;
    }
    const token = String(payload?.data?.token || "").trim();
    if (!res.ok || payload?.success === false || !token) {
      return {
        ok: false,
        message:
          String(payload?.message || "").trim() ||
          "ورود مهمان ممکن نشد. دوباره تلاش کنید."
      };
    }
    writeCookie(PUBLIC_AUTH_COOKIE_NAME, token, TOKEN_COOKIE_DAYS);
    const session = writeGuestSession(DEFAULT_GUEST_NAME);
    if (!session) {
      return { ok: false, message: "ذخیره نشست مهمان ناموفق بود." };
    }
    return { ok: true, token, session };
  } catch {
    return {
      ok: false,
      message: "ارتباط با سرور برقرار نشد. دوباره تلاش کنید."
    };
  }
}

/**
 * After phone OTP: optionally copy guest name onto the phone account,
 * retire the old guest row when ids differ, write new cookie, clear marker.
 */
export async function finalizeGuestPhoneUpgrade(options: {
  guestToken: string;
  guestId: number | null;
  guestName: string;
  authToken: string;
  authUserId: number | string;
  linkGuestName: boolean;
}): Promise<void> {
  const {
    guestToken,
    guestId,
    guestName,
    authToken,
    authUserId,
    linkGuestName
  } = options;

  if (linkGuestName) {
    const name =
      String(guestName || DEFAULT_GUEST_NAME).trim() || DEFAULT_GUEST_NAME;
    const profileRes = await fetch(resolveApiUrl("/setProfile"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        user_Id: authUserId,
        name
      })
    });
    const profileJson = (await profileRes.json().catch(() => null)) as {
      success?: boolean;
      message?: string;
    } | null;
    if (!profileRes.ok || profileJson?.success === false) {
      throw new Error(
        String(profileJson?.message || "").trim() ||
          "ذخیره نام روی حساب شماره‌دار ناموفق بود."
      );
    }
  }

  if (
    guestToken &&
    guestId != null &&
    String(guestId) !== String(authUserId)
  ) {
    await retireGuestAccount(guestToken, guestId);
  }

  writeCookie(PUBLIC_AUTH_COOKIE_NAME, authToken, TOKEN_COOKIE_DAYS);
  clearGuestSession();
}

export async function reloadWithFreshProfile(token: string): Promise<void> {
  await fetch(resolveApiUrl("/getProfile"), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}
