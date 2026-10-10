import { PANEL_ROUTES, resolveApiUrl } from "@/lib/apiRoutes";
import { readCookie } from "../support/supportTypes";

type ApiResult<T> = {
  ok: boolean;
  data: T & { success?: boolean; message?: string };
};

async function panelRequest<T = Record<string, unknown>>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  tokenOverride?: string
): Promise<ApiResult<T>> {
  const token =
    tokenOverride || readCookie("panelToken") || readCookie("token");
  const res = await fetch(resolveApiUrl(path), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    success?: boolean;
    message?: string;
  };
  return { ok: res.ok, data };
}

export function panelUsersErrorMessage(
  message: string | undefined,
  fallback: string
): string {
  const trimmed = (message || "").trim();
  if (!trimmed) return fallback;
  return /[\u0600-\u06FF]/.test(trimmed) ? trimmed : fallback;
}

export async function deletePanelUser(
  token: string | undefined,
  userId: number
) {
  return panelRequest("POST", PANEL_ROUTES.usersDelete, { id: userId }, token);
}

/** Resolve id/name from list rows or user detail payloads. */
export function panelUserDeleteTarget(row: unknown): {
  id: number;
  name: string;
} | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const rawId = r.id ?? r["شناسه"];
  const id = Number(rawId);
  if (!Number.isFinite(id) || id <= 0) return null;
  const name = String(r.name ?? r["نام"] ?? r.full_name ?? "کاربر").trim();
  return { id, name: name || "کاربر" };
}
