/**
 * "افزودن همراه" flow.
 *
 * The companion picker is a dialog on the center / offers / staff screens, but
 * adding a companion navigates away to the AddPatient page. We remember which
 * screen opened the picker so that both submitting and cancelling land back on
 * that screen with the picker re-opened, instead of dropping the user on a bare
 * page with their booking context lost.
 */

/** Screens that host a companion picker dialog. */
export type CompanionDialogHost =
  | "center"
  | "centerOffers"
  | "staff"
  | "visitBooking";

export type CompanionReturn = {
  /** `router.asPath` of the screen that opened the picker. */
  path: string;
  host: CompanionDialogHost;
};

const STORAGE_KEY = "sayban.companion.return";

const HOSTS: CompanionDialogHost[] = [
  "center",
  "centerOffers",
  "staff",
  "visitBooking"
];

export function rememberCompanionReturn(entry: CompanionReturn) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    /* ignore */
  }
}

export function readCompanionReturn(): CompanionReturn | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CompanionReturn;
    if (typeof parsed?.path !== "string" || !parsed.path) return null;
    if (!HOSTS.includes(parsed.host)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearCompanionReturn() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Compares routes ignoring query and trailing slashes. */
export function isSameRoute(a: string, b: string): boolean {
  const normalize = (value: string) =>
    String(value || "")
      .split(/[?#]/)[0]
      .replace(/\/+$/, "");
  const left = normalize(a);
  return Boolean(left) && left === normalize(b);
}
