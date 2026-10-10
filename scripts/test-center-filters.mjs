/**
 * Unit tests for components/centers/centerFilters.ts
 *
 *   npx tsx scripts/test-center-filters.mjs
 */
import {
  activeFilterKeys,
  filterChipLabel,
  filterEntryValue,
  makeFilterEntry,
  readAvailabilityFilter,
  readCenterTypeFilter,
  readNearbyFilter,
  readRateFilter,
  serializeFiltersForApi,
  draftFromFiltes,
  filtesFromDraft,
  EMPTY_FILTER_DRAFT
} from "../components/centers/centerFilters.ts";
import {
  filterCentersByAvailability,
  filterCentersByMinRate
} from "../components/centers/centerListFilters.ts";

let failures = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`ok   ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL ${name}\n  expected ${e}\n  actual   ${a}`);
  }
}

check(
  "label: structured center_type",
  filterChipLabel("center_type", makeFilterEntry("day_care", "نوع: روزانه")),
  "نوع: روزانه"
);
check("label: legacy string nearby", filterChipLabel("nearby", "nearby"), "نزدیک‌ترین به آدرس فعلی");
check(
  "label: structured rate",
  filterChipLabel("rate", { value: 4, label: "امتیاز 4 به بالا" }),
  "امتیاز 4 به بالا"
);
check(
  "label: legacy availability",
  filterChipLabel("availability", "open_now"),
  "در حال حاضر باز"
);
check("label: skips any", filterChipLabel("availability", "any"), null);

check(
  "keys: active only",
  activeFilterKeys({
    center_type: makeFilterEntry("day_care", "نوع: روزانه"),
    availability: "any",
    nearby: makeFilterEntry("nearby", "نزدیک‌ترین به آدرس فعلی")
  }),
  ["center_type", "nearby"]
);

check(
  "api: strips labels and any",
  serializeFiltersForApi({
    center_type: makeFilterEntry("day_care", "نوع: روزانه"),
    nearby: makeFilterEntry("nearby", "نزدیک‌ترین"),
    rate: { value: 3, label: "امتیاز 3 به بالا" },
    availability: makeFilterEntry("open_now", "در حال حاضر باز")
  }),
  {
    rate: { value: 3 },
    availability: "open_now"
  }
);

check(
  "read: center type",
  readCenterTypeFilter({ center_type: makeFilterEntry("residential", "نوع: شبانه‌روزی") }),
  "residential"
);
check(
  "read: nearby",
  readNearbyFilter({ nearby: makeFilterEntry("nearby", "نزدیک") }),
  true
);
check(
  "read: rate",
  readRateFilter({ rate: makeFilterEntry(4, "امتیاز 4 به بالا") }),
  4
);
check(
  "read: availability",
  readAvailabilityFilter({
    availability: makeFilterEntry("bookable", "قابل نوبت‌دهی")
  }),
  "bookable"
);
check(
  "filter: min rate",
  filterCentersByMinRate(
    [{ rating_avg: 4.5 }, { rating_avg: 2.5 }, { rating_avg: "3.0" }],
    3
  ).length,
  2
);
check(
  "filter: open now",
  filterCentersByAvailability(
    [{ is_open_now: 1 }, { is_open_now: 0 }],
    "open_now"
  ).length,
  1
);
check(
  "draft: round trip nearby",
  filtesFromDraft({
    ...EMPTY_FILTER_DRAFT,
    nearby: "nearby"
  }).nearby,
  makeFilterEntry("nearby", "نزدیک‌ترین به آدرس فعلی")
);
check(
  "draft: round trip rate",
  filterEntryValue(
    filtesFromDraft({ ...EMPTY_FILTER_DRAFT, rate: 4 }).rate
  ),
  4
);
check(
  "draft: from filtes",
  draftFromFiltes({
    rate: makeFilterEntry(3, "امتیاز 3 به بالا"),
    availability: "open_now"
  }).rate,
  3
);
check("value: legacy string", filterEntryValue("day_care"), "day_care");
check("value: object", filterEntryValue({ value: 5, label: "x" }), 5);

console.log(
  failures === 0 ? "\nall center-filter checks passed" : `\n${failures} failure(s)`
);
process.exit(failures === 0 ? 0 : 1);
