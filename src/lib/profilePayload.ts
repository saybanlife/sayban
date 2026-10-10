/**
 * Normalize optional profile extras on setProfile so blank strings do not
 * trip workflow/database validators. Empty values become null; COALESCE in
 * n8n then leaves existing DB columns unchanged.
 */
const PROFILE_ENDPOINT = /(?:^|\/)setProfile\/?(?:\?.*)?$/i;

const OPTIONAL_NULL_KEYS = [
  "national_code",
  "city",
  "birth_date"
] as const;

export function normalizeOptionalProfileNationalCode(
  url: string,
  body?: Record<string, any>
): Record<string, any> | undefined {
  if (!body || !PROFILE_ENDPOINT.test(String(url || ""))) return body;

  let next: Record<string, any> | undefined;
  for (const key of OPTIONAL_NULL_KEYS) {
    if (!(key in (next || body))) continue;
    const raw = String((next || body)[key] ?? "").trim();
    if (raw) {
      if (next && next[key] !== raw) {
        next = { ...next, [key]: raw };
      }
      continue;
    }
    next = { ...(next || body), [key]: null };
  }
  return next || body;
}
