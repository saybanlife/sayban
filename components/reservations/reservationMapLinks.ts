import { parseCoord } from "../home/currentAddressModel";

export type MapLocationInput = {
  latitude?: unknown;
  longitude?: unknown;
  lat?: unknown;
  lng?: unknown;
  lon?: unknown;
  city?: unknown;
  address?: unknown;
  details?: unknown;
  query?: unknown;
};

export function resolveMapCoords(input?: MapLocationInput | null): {
  lat: number;
  lng: number;
} | null {
  if (!input) return null;
  const lat = parseCoord(
    input.latitude ?? input.lat
  );
  const lng = parseCoord(
    input.longitude ?? input.lng ?? input.lon
  );
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

export function resolveMapQuery(input?: MapLocationInput | null): string {
  if (!input) return "";
  if (typeof input.query === "string" && input.query.trim()) {
    return input.query.trim();
  }
  const parts = [input.city, input.address, input.details]
    .map(part => String(part ?? "").trim())
    .filter(Boolean);
  // Deduplicate adjacent repeats (e.g. city already inside address).
  return parts
    .filter((part, index) => parts[index - 1] !== part)
    .join("، ");
}

/**
 * Always open Google Maps (panel is desktop-first). Prefer exact coordinates;
 * fall back to a text search of the stored address.
 */
export function getGoogleMapsUrl(input?: MapLocationInput | null): string {
  const coords = resolveMapCoords(input);
  if (coords) {
    return `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
  }
  const query = resolveMapQuery(input);
  if (!query) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
