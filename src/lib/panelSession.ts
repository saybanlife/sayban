/**
 * Panel session teardown.
 *
 * The panel session is not just a cookie: `/panel/login` is a sub-route of the
 * same Plasmic page component as the rest of the panel, so a client-side
 * navigation there keeps `$state.token`/`$state.userInfo` alive and the panel
 * stays rendered and authenticated. Logout therefore has to drop the cookies,
 * purge cached per-user data, and do a full document navigation so all
 * in-memory state is destroyed and the panel leaves the history stack.
 */

import {
  PANEL_AUTH_COOKIE_NAME,
  PUBLIC_AUTH_COOKIE_NAME,
  deleteCookie,
  readCookie
} from "./authCookies";
import { clearApiCache } from "./persistentApiCache";

export const PANEL_LOGIN_PATH = "/panel/login";

/** localStorage keys that hold data scoped to the signed-in user. */
const USER_SCOPED_LOCAL_KEYS = [
  "notificationReminderLater",
  "seenArrey",
  "reminder",
  "reminder_slide",
  "sayban.currentAddressId"
];

/** localStorage key prefixes whose every entry is user-scoped. */
const USER_SCOPED_LOCAL_PREFIXES = ["sayban:apicache", "sayban.tehranNotice"];

export function hasPanelSession(): boolean {
  return Boolean(readCookie(PANEL_AUTH_COOKIE_NAME));
}

function clearLocalStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const storage = window.localStorage;
    for (const key of USER_SCOPED_LOCAL_KEYS) {
      storage.removeItem(key);
    }
    const doomed: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && USER_SCOPED_LOCAL_PREFIXES.some(p => key.startsWith(p))) {
        doomed.push(key);
      }
    }
    doomed.forEach(key => storage.removeItem(key));
  } catch {
    // Private mode / quota errors must not block logout.
  }
}

export function clearPanelSession(): void {
  // Both cookies: the support and reviews helpers fall back to `token`, so a
  // panel logout that only drops `panelToken` still leaves those authenticated.
  deleteCookie(PANEL_AUTH_COOKIE_NAME);
  deleteCookie(PUBLIC_AUTH_COOKIE_NAME);

  clearApiCache();
  clearLocalStorage();

  try {
    // sessionStorage is per-tab and entirely session scoped, so it all goes.
    window.sessionStorage?.clear();
  } catch {
    // ignore
  }
}

/**
 * Clear the session and hard-navigate to the login page. `location.replace`
 * (not `router.push`) is deliberate: it tears down all React/Plasmic state and
 * removes the panel from the history stack so Back cannot restore it.
 */
export function logoutPanel(loginPath: string = PANEL_LOGIN_PATH): void {
  clearPanelSession();
  if (typeof window === "undefined") return;
  window.location.replace(loginPath);
}
