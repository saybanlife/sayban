export function buildCenterRoute(pageBase: string, centerId: unknown) {
  const safePage =
    String(pageBase || "home").replace(/[^a-zA-Z0-9_-]/g, "") || "home";
  const safeCenterId = String(centerId ?? "").trim();
  if (!safeCenterId) return null;
  return `/${safePage}/center/${encodeURIComponent(safeCenterId)}`;
}

/** Public staff profile: `/home/staff_{id}` */
export function buildStaffRoute(pageBase: string, staffId: unknown) {
  const safePage =
    String(pageBase || "home").replace(/[^a-zA-Z0-9_-]/g, "") || "home";
  const safeStaffId = String(staffId ?? "").trim();
  if (!safeStaffId || !/^\d+$/.test(safeStaffId)) return null;
  return `/${safePage}/staff_${encodeURIComponent(safeStaffId)}`;
}

/** Full nurse list for a center: `/home/centerStaffs_{centerId}` */
export function buildCenterStaffListRoute(
  pageBase: string,
  centerId: unknown
) {
  const safePage =
    String(pageBase || "home").replace(/[^a-zA-Z0-9_-]/g, "") || "home";
  const safeCenterId = String(centerId ?? "").trim();
  if (!safeCenterId) return null;
  return `/${safePage}/centerStaffs_${encodeURIComponent(safeCenterId)}`;
}

export function extractCenterStaffsIdFromSlug(
  slug: string | string[] | undefined
): string | null {
  const parts = Array.isArray(slug)
    ? slug
    : typeof slug === "string" && slug.trim()
      ? [slug.trim()]
      : [];
  for (const part of parts) {
    const match = String(part).match(/^centerStaffs_(.+)$/i);
    if (match?.[1]) return match[1];
  }
  return null;
}
