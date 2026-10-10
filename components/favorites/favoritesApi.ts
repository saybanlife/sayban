import { PUBLIC_ROUTES, resolveApiUrl } from "@/lib/apiRoutes";
import { publicBearerConfig } from "@/lib/publicAuthHeaders";
import { parseNumericCenterId } from "./CenterFavoriteContext";

export type FavoriteCenter = {
  id: number | string;
  name?: string;
  main_image?: string;
  rating_avg?: number | string;
  address?: string;
  center_type?: string;
  city?: string;
  area?: string;
  status?: number | string | boolean;
};

export const FAVORITES_CHANGED = "sayban:favorites-changed";

function authHeaders(token?: string | null) {
  const config = publicBearerConfig(token);
  if (!config?.headers?.Authorization) return null;
  return {
    Authorization: config.headers.Authorization,
    Accept: "application/json",
    "Content-Type": "application/json"
  };
}

async function readJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function unwrapPayload(data: any) {
  if (!data || typeof data !== "object") return {};
  if (data.data && typeof data.data === "object" && !Array.isArray(data.data)) {
    return { ...data, ...data.data };
  }
  if (
    data.result &&
    typeof data.result === "object" &&
    !Array.isArray(data.result) &&
    ("favorited" in data.result || "success" in data.result)
  ) {
    return { ...data, ...data.result };
  }
  return data;
}

export function notifyFavoritesChanged(
  centerId: string | number,
  favorited: boolean
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(FAVORITES_CHANGED, { detail: { centerId, favorited } })
  );
}

export async function fetchFavoriteStatus(
  centerId: string | number,
  token?: string | null
) {
  const id = parseNumericCenterId(centerId);
  if (!id) return { loggedIn: false, favorited: false };
  const headers = authHeaders(token);
  if (!headers) return { loggedIn: false, favorited: false };
  const url = new URL(resolveApiUrl(PUBLIC_ROUTES.favoritesStatus));
  url.searchParams.set("center_id", String(id));
  const res = await fetch(url.toString(), { headers });
  const data = unwrapPayload(await readJson(res));
  if (res.status === 401 || res.status === 403) {
    return { loggedIn: false, favorited: false };
  }
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "وضعیت علاقه‌مندی دریافت نشد.");
  }
  if (typeof data?.favorited !== "boolean") {
    throw new Error("پاسخ وضعیت علاقه‌مندی نامعتبر است.");
  }
  return { loggedIn: true, favorited: data.favorited };
}

export async function toggleFavorite(
  centerId: string | number,
  token?: string | null
) {
  const id = parseNumericCenterId(centerId);
  if (!id) {
    throw new Error("شناسه مرکز نامعتبر است.");
  }
  const headers = authHeaders(token);
  if (!headers) {
    return { loggedIn: false as const, favorited: false };
  }
  const res = await fetch(resolveApiUrl(PUBLIC_ROUTES.favoritesToggle), {
    method: "POST",
    headers,
    body: JSON.stringify({ center_id: id })
  });
  const data = unwrapPayload(await readJson(res));
  if (res.status === 401 || res.status === 403) {
    return { loggedIn: false as const, favorited: false };
  }
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "ذخیره علاقه‌مندی ناموفق بود.");
  }
  // Empty 200 body used to happen when center_id was NaN — treat as failure.
  if (typeof data?.favorited !== "boolean") {
    throw new Error("پاسخ ذخیره علاقه‌مندی نامعتبر است.");
  }
  return { loggedIn: true as const, favorited: data.favorited };
}

export async function fetchFavoriteCenters(token?: string | null) {
  const headers = authHeaders(token);
  if (!headers) {
    return { loggedIn: false as const, centers: [] as FavoriteCenter[] };
  }
  const res = await fetch(resolveApiUrl(PUBLIC_ROUTES.favorites), { headers });
  const data = unwrapPayload(await readJson(res));
  if (res.status === 401 || res.status === 403) {
    return { loggedIn: false as const, centers: [] as FavoriteCenter[] };
  }
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "لیست علاقه‌مندی‌ها دریافت نشد.");
  }
  const list = Array.isArray(data?.result)
    ? data.result
    : Array.isArray(data?.data)
      ? data.data
      : [];
  return { loggedIn: true as const, centers: list as FavoriteCenter[] };
}
