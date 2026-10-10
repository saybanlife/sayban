import { PANEL_ROUTES, resolveApiUrl } from "@/lib/apiRoutes";

export type PanelUserProfileInput = {
  centerId: string | number;
  userId?: string | number | null;
  name: string;
  email: string;
  mobile?: string;
  password?: string;
};

export type PanelUserProfileResult = {
  id: number;
  center_id?: number | null;
  name?: string;
  email?: string;
  mobile?: string;
  is_active?: number;
};

/**
 * Create or update a center_admin row in panel__users.
 * - existing userId → update
 * - missing userId → create (password required)
 */
export async function upsertPanelUserProfile(
  token: string | undefined,
  input: PanelUserProfileInput
): Promise<PanelUserProfileResult> {
  const userId = Number(input.userId);
  const hasUser = Number.isFinite(userId) && userId > 0;
  const body: Record<string, unknown> = {
    name: String(input.name || "").trim(),
    email: String(input.email || "").trim(),
    mobile: String(input.mobile || "").trim()
  };

  if (hasUser) {
    body.id = userId;
  } else {
    body.center_id = Number(input.centerId);
    const password = String(input.password || "");
    if (!password) {
      throw new Error("برای ایجاد حساب مرکز، رمز عبور الزامی است.");
    }
    body.password = password;
  }

  const res = await fetch(resolveApiUrl(PANEL_ROUTES.usersEdit), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok || !data?.success || !data?.result?.id) {
    throw new Error(
      data?.message || `users edit failed: ${res.status || "unknown"}`
    );
  }
  return data.result as PanelUserProfileResult;
}
