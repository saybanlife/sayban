/**
 * «افزودن آدرس» from AddressDialog (questionnaire / booking).
 *
 * Plasmic navigates via `$state.slug.push("addAddress")`, which drifts from
 * `router.asPath` after browser Back and sends users to the wrong URL. We
 * remember the opener path and build the add-address destination from the live
 * route instead.
 */

export type AddressDialogReturn = {
  /** Full `router.asPath` when the user tapped «افزودن آدرس». */
  path: string;
};

const STORAGE_KEY = "sayban.addressDialog.return";

export function rememberAddressDialogReturn(path: string) {
  if (typeof window === "undefined") return;
  const trimmed = String(path || "").trim();
  if (!trimmed) return;
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ path: trimmed } satisfies AddressDialogReturn)
    );
  } catch {
    /* ignore */
  }
}

export function readAddressDialogReturn(): AddressDialogReturn | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AddressDialogReturn;
    if (typeof parsed?.path !== "string" || !parsed.path.trim()) return null;
    return { path: parsed.path.trim() };
  } catch {
    return null;
  }
}

export function clearAddressDialogReturn() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function pathOnly(value: string) {
  return String(value || "")
    .split(/[?#]/)[0]
    .replace(/\/+$/, "");
}

export function isSameRoute(a: string, b: string) {
  const left = pathOnly(a);
  const right = pathOnly(b);
  return Boolean(left) && left === right;
}

export function isAddAddressRoute(path?: string) {
  return Boolean(path && /\/addAddress(\/|$)/i.test(pathOnly(path)));
}

/** Build `/{pageBase}/…/addAddress` from the current nested route. */
export function buildAddAddressDestination(pageBase: string, asPath: string) {
  const base = `/${String(pageBase || "home").replace(/^\/+|\/+$/g, "")}`;
  const current = pathOnly(asPath);
  if (!current.startsWith(base)) {
    return `${base}/addAddress`;
  }
  let tail = current.slice(base.length).replace(/^\/+/, "");
  tail = tail.replace(/(\/addAddress)+$/i, "");
  return tail ? `${base}/${tail}/addAddress` : `${base}/addAddress`;
}

/** Pop one `/addAddress` segment; used when leaving the add-address screen. */
export function stripAddAddressSegment(asPath: string, pageBase: string) {
  const dest = buildAddAddressDestination(pageBase, asPath);
  const current = pathOnly(asPath);
  if (current === pathOnly(dest)) {
    const base = `/${String(pageBase || "home").replace(/^\/+|\/+$/g, "")}`;
    let tail = current.slice(base.length).replace(/^\/+/, "");
    tail = tail.replace(/(\/addAddress)+$/i, "");
    return tail ? `${base}/${tail}` : base;
  }
  return current;
}
