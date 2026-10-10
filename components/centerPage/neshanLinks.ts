/**
 * Official Neshan deep links (platform FAQ):
 * https://nshn.ir/?lat={lat}&lng={lng}
 *
 * The old iframe hash URL (`neshan.org/maps/iframe/places/#c…`) can preview
 * correctly in-browser but opens the wrong place in the Neshan app / “مشاهده در نشان”.
 */

export function parseCoord(value?: number | string | null): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

/** Open location in Neshan web / app (correct lat→lat, lng→lng). */
export function getNeshanPlaceUrl(
  lat?: number | string | null,
  lng?: number | string | null
): string {
  const latitude = parseCoord(lat);
  const longitude = parseCoord(lng);
  if (latitude == null || longitude == null) return "";
  return `https://nshn.ir/?lat=${encodeURIComponent(String(latitude))}&lng=${encodeURIComponent(String(longitude))}`;
}

/** @deprecated Use getNeshanPlaceUrl — kept for callers expecting open-in-app URL */
export function getNeshanAppUrl(
  lat?: number | string | null,
  lng?: number | string | null
) {
  return getNeshanPlaceUrl(lat, lng);
}

/** Embed preview map (maps.neshan.org uses @lat,lng). */
export function getNeshanEmbedSrc(
  lat?: number | string | null,
  lng?: number | string | null,
  zoom = 16
): string | undefined {
  const latitude = parseCoord(lat);
  const longitude = parseCoord(lng);
  if (latitude == null || longitude == null) return undefined;
  return `https://maps.neshan.org/@${latitude},${longitude},${zoom}.0z,0.0p`;
}
