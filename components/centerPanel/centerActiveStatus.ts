import { PANEL_ROUTES, resolveApiUrl } from "@/lib/apiRoutes";

export type CenterActiveStatusResult = {
  id: number;
  is_active: number;
};

/**
 * Enables/disables the center itself (`centers.is_active`), independent of the
 * panel login account toggle.
 */
export async function setCenterActiveStatus(
  centerId: string | number,
  isActive: boolean
): Promise<CenterActiveStatusResult> {
  const res = await fetch(resolveApiUrl(PANEL_ROUTES.centerActiveStatus), {
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

  if (!res.ok) throw new Error(`center active status request failed: ${res.status}`);

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!data?.success || !data?.result) {
    throw new Error(data?.message || "center active status update rejected");
  }
  return data.result as CenterActiveStatusResult;
}
