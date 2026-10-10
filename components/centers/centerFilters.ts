/**
 * Shared helpers for the centers list filter bar and `/centers` query params.
 *
 * Every active filter is stored as `{ value, label }` so header chips always
 * have human-readable text. Legacy plain-string entries are still accepted.
 */

export type FilterEntry = {
  value?: string | number | null;
  label?: string | null;
};

export type CentersFilters = Record<
  string,
  FilterEntry | string | number | null | undefined
>;

const CENTER_TYPE_LABELS: Record<string, string> = {
  day_care: "روزانه",
  residential: "شبانه‌روزی",
  comprehensive: "هر دو"
};

const AVAILABILITY_LABELS: Record<string, string> = {
  open_now: "در حال حاضر باز",
  bookable: "قابل نوبت‌دهی",
  any: "همه"
};

const FILTER_KEY_PREFIX: Record<string, string> = {
  center_type: "نوع",
  nearby: "فاصله",
  rate: "امتیاز",
  availability: "دسترسی"
};

export function filterEntryValue(
  entry: unknown
): string | number | null | undefined {
  if (entry == null || entry === "") return null;
  if (typeof entry === "object" && !Array.isArray(entry)) {
    const record = entry as FilterEntry;
    const value = record.value;
    if (value == null || value === "") return null;
    return value;
  }
  if (typeof entry === "string" || typeof entry === "number") return entry;
  return null;
}

/** Resolve a chip label for any stored filter shape. */
export function filterChipLabel(key: string, entry: unknown): string | null {
  const value = filterEntryValue(entry);
  if (value == null || value === "" || value === "any") return null;

  if (entry && typeof entry === "object" && !Array.isArray(entry)) {
    const label = String((entry as FilterEntry).label ?? "").trim();
    if (label) return label;
  }

  if (typeof entry === "string" && entry.trim() && !/^[a-z_]+$/.test(entry)) {
    return entry.trim();
  }

  switch (key) {
    case "center_type":
      return `${FILTER_KEY_PREFIX.center_type}: ${
        CENTER_TYPE_LABELS[String(value)] ?? String(value)
      }`;
    case "nearby":
      return value === "nearby" ? "نزدیک‌ترین به آدرس فعلی" : String(value);
    case "rate":
      return `امتیاز ${value} به بالا`;
    case "availability":
      return (
        AVAILABILITY_LABELS[String(value)] ??
        `${FILTER_KEY_PREFIX.availability}: ${value}`
      );
    default:
      return String(value);
  }
}

export function activeFilterKeys(filtes: CentersFilters | null | undefined): string[] {
  if (!filtes || typeof filtes !== "object") return [];
  return Object.keys(filtes).filter(key => filterChipLabel(key, filtes[key]) != null);
}

export function makeFilterEntry(
  value: string | number,
  label: string
): FilterEntry {
  return { value, label };
}

/** Strip labels before sending nested `filter` to `/centers`. */
export function serializeFiltersForApi(
  filtes: CentersFilters | null | undefined
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!filtes || typeof filtes !== "object") return out;

  for (const [key, raw] of Object.entries(filtes)) {
    const value = filterEntryValue(raw);
    if (value == null || value === "" || value === "any") continue;

    if (key === "rate") {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) {
        out.rate = { value: numeric };
      }
      continue;
    }

    // Promoted to top-level query params in Subcategories.tsx
    if (key === "center_type" || key === "nearby") continue;

    out[key] = value;
  }

  return out;
}

export function readCenterTypeFilter(
  filtes: CentersFilters | null | undefined
): string {
  return String(filterEntryValue(filtes?.center_type) ?? "").trim();
}

export function readNearbyFilter(
  filtes: CentersFilters | null | undefined
): boolean {
  return filterEntryValue(filtes?.nearby) === "nearby";
}

export function readRateFilter(
  filtes: CentersFilters | null | undefined
): number {
  const raw = filterEntryValue(filtes?.rate);
  const numeric = Number(raw);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

export function readAvailabilityFilter(
  filtes: CentersFilters | null | undefined
): string {
  return String(filterEntryValue(filtes?.availability) ?? "").trim();
}

export type CentersFilterDraft = {
  nearby: string;
  centerType: string;
  rate: number;
  availability: string;
};

export const EMPTY_FILTER_DRAFT: CentersFilterDraft = {
  nearby: "",
  centerType: "",
  rate: 0,
  availability: "any"
};

const CENTER_TYPE_FILTER_LABELS: Record<string, string> = {
  day_care: "روزانه",
  residential: "شبانه‌روزی",
  comprehensive: "هر دو"
};

export function draftFromFiltes(
  filtes: CentersFilters | null | undefined
): CentersFilterDraft {
  const source = filtes && typeof filtes === "object" ? filtes : {};
  const availability = String(filterEntryValue(source.availability) ?? "").trim();
  return {
    nearby: String(filterEntryValue(source.nearby) ?? ""),
    centerType: String(filterEntryValue(source.center_type) ?? ""),
    rate: Number(filterEntryValue(source.rate) ?? 0) || 0,
    availability: availability || "any"
  };
}

export function filtesFromDraft(draft: CentersFilterDraft): CentersFilters {
  const next: CentersFilters = {};

  if (draft.nearby === "nearby") {
    next.nearby = makeFilterEntry("nearby", "نزدیک‌ترین به آدرس فعلی");
  }

  if (draft.centerType) {
    const label = CENTER_TYPE_FILTER_LABELS[draft.centerType];
    if (label) {
      next.center_type = makeFilterEntry(draft.centerType, `نوع: ${label}`);
    }
  }

  if (draft.rate > 0) {
    next.rate = makeFilterEntry(draft.rate, `امتیاز ${draft.rate} به بالا`);
  }

  if (draft.availability && draft.availability !== "any") {
    const opt = AVAILABILITY_FILTER_OPTIONS.find(
      item => item.value === draft.availability
    );
    next.availability = makeFilterEntry(
      draft.availability,
      opt?.label ?? draft.availability
    );
  }

  return next;
}

export const AVAILABILITY_FILTER_OPTIONS = [
  { label: "همه", value: "any" },
  { label: "در حال حاضر باز", value: "open_now" },
  { label: "قابل نوبت‌دهی", value: "bookable" }
] as const;
