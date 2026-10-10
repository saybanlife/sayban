export type UserAddress = {
  id: number;
  user_id?: number;
  title?: string | null;
  address?: string | null;
  details?: string | null;
  city?: string | null;
  postal_code?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  is_current?: number | boolean | null;
};

export const CURRENT_ADDRESS_STORAGE_KEY = "sayban.currentAddressId";

export function parseCoord(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n)) return null;
  if (Math.abs(n) < 1e-8) return null; // treat 0/0 as missing
  return n;
}

export function addressHasCoords(addr?: UserAddress | null) {
  if (!addr) return false;
  return (
    parseCoord(addr.latitude) != null && parseCoord(addr.longitude) != null
  );
}

export function formatAddressChipLabel(addr?: UserAddress | null) {
  if (!addr) return "انتخاب آدرس";
  const title = String(addr.title || "").trim();
  const city = String(addr.city || "").trim();
  if (title && city) return title;
  if (title) return title;
  if (city) return city;
  const line = String(addr.address || "").trim();
  return line ? line.slice(0, 22) : "آدرس فعلی";
}

export function formatAddressSubtitle(addr?: UserAddress | null) {
  if (!addr) return "برای مراکز نزدیک آدرس بزنید";
  const city = String(addr.city || "").trim();
  const line = String(addr.address || "").trim();
  if (city && line) return `${city}، ${line}`;
  return line || city || "آدرس ذخیره‌شده";
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function normalizeAddressList(payload: unknown): UserAddress[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as UserAddress[];
  if (typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as UserAddress[];
    if (Array.isArray(obj.result)) return obj.result as UserAddress[];
  }
  return [];
}

export function readStoredAddressId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(CURRENT_ADDRESS_STORAGE_KEY);
  const id = raw ? Number(raw) : NaN;
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function writeStoredAddressId(id: number | null) {
  if (typeof window === "undefined") return;
  if (id == null) {
    window.localStorage.removeItem(CURRENT_ADDRESS_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(CURRENT_ADDRESS_STORAGE_KEY, String(id));
}
