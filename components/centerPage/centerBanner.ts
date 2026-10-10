export const DEFAULT_CENTER_BANNER_SRC =
  "/plasmic/sayban/images/HeroImage.png";
 
export function resolveCenterBannerSrc(center?: {
  banner_image?: unknown;
} | null): string {
  const custom = String(center?.banner_image ?? "").trim();
  return custom || DEFAULT_CENTER_BANNER_SRC;
}
 
export function extractUploadedBannerUrl(payload: unknown): string {
  const data = payload as any;
  const candidates = [
    data?.result?.[0]?.url,
    data?.result?.[0],
    data?.result?.url,
    data?.url,
    data?.data?.result?.[0]?.url,
    data?.data?.result?.[0]
  ];
  return String(candidates.find(value => typeof value === "string" && value.trim()) || "").trim();
}