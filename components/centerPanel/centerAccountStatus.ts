import { PANEL_ROUTES, resolveApiUrl } from "@/lib/apiRoutes";

export type CenterAccountStatusResult = {
  id: number;
  center_id: number;
  is_active: number;
};

/**
 * Enables/disables the panel login of a center's `center_admin` account.
 * Returns the stored row so callers can confirm the applied value, or null when
 * the center has no admin account.
 */
export async function setCenterAccountStatus(
  centerId: string | number,
  isActive: boolean
): Promise<CenterAccountStatusResult | null> {
  const res = await fetch(resolveApiUrl(PANEL_ROUTES.centerAccountStatus), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      center_id: Number(centerId),
      is_active: isActive ? 1 : 0
    })
  });

  if (!res.ok) throw new Error(`account status request failed: ${res.status}`);

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!data?.success) {
    throw new Error(data?.message || "account status update rejected");
  }
  return (data.result as CenterAccountStatusResult) ?? null;
}
