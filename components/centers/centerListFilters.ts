/** Client-side fallbacks for `/centers` when query params are ignored or stale. */

export function centerRating(row: unknown): number {
  if (!row || typeof row !== "object") return 0;
  const raw = (row as Record<string, unknown>).rating_avg;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function centerFlagTruthy(row: unknown, key: string): boolean {
  if (!row || typeof row !== "object") return false;
  const value = (row as Record<string, unknown>)[key];
  return value === 1 || value === "1" || value === true;
}

export function filterCentersByMinRate(rows: unknown[], minRate: number): unknown[] {
  if (!Number.isFinite(minRate) || minRate <= 0) return rows;
  return rows.filter(row => centerRating(row) >= minRate);
}

export function filterCentersByAvailability(
  rows: unknown[],
  availability: string
): unknown[] {
  const wanted = String(availability || "").trim();
  if (!wanted || wanted === "any") return rows;

  if (wanted === "open_now") {
    return rows.filter(row => centerFlagTruthy(row, "is_open_now"));
  }
  if (wanted === "bookable") {
    return rows.filter(row => centerFlagTruthy(row, "is_bookable"));
  }
  return rows;
}
