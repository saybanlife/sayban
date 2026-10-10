import type { DispatchTehranDistrictOption } from "./centerFactsSchema";
import { DISPATCH_TEHRAN_DISTRICT_OPTIONS } from "./centerFactsSchema";

export const COVERAGE_ALL_TEHRAN = "سراسر تهران" as const;
export const COVERAGE_KARAJ = "کرج" as const;

const OPTION_ORDER = new Map(
  DISPATCH_TEHRAN_DISTRICT_OPTIONS.map((option, index) => [option, index])
);

export function isCoverageDistrictOption(
  option: string
): option is DispatchTehranDistrictOption {
  return (
    option !== COVERAGE_ALL_TEHRAN &&
    option !== COVERAGE_KARAJ &&
    DISPATCH_TEHRAN_DISTRICT_OPTIONS.includes(
      option as DispatchTehranDistrictOption
    )
  );
}

/** Sort selected labels in canonical option order. */
export function sortCoverageAreas(
  selected: readonly string[]
): DispatchTehranDistrictOption[] {
  return [...selected]
    .filter((item): item is DispatchTehranDistrictOption =>
      DISPATCH_TEHRAN_DISTRICT_OPTIONS.includes(
        item as DispatchTehranDistrictOption
      )
    )
    .sort(
      (a, b) => (OPTION_ORDER.get(a) ?? 999) - (OPTION_ORDER.get(b) ?? 999)
    );
}

/**
 * Toggle coverage selection:
 * - «سراسر تهران» clears districts 1–22 but keeps «کرج»
 * - picking a district clears «سراسر تهران»
 * - «کرج» is independent of both
 */
export function toggleCoverageArea(
  current: readonly DispatchTehranDistrictOption[],
  option: DispatchTehranDistrictOption
): DispatchTehranDistrictOption[] {
  if (option === COVERAGE_ALL_TEHRAN) {
    const hasAll = current.includes(COVERAGE_ALL_TEHRAN);
    const karaj = current.includes(COVERAGE_KARAJ) ? [COVERAGE_KARAJ] : [];
    return hasAll ? karaj : [COVERAGE_ALL_TEHRAN, ...karaj];
  }

  if (option === COVERAGE_KARAJ) {
    const hasKaraj = current.includes(COVERAGE_KARAJ);
    return hasKaraj
      ? current.filter(item => item !== COVERAGE_KARAJ)
      : sortCoverageAreas([...current, COVERAGE_KARAJ]);
  }

  const withoutAll = current.filter(item => item !== COVERAGE_ALL_TEHRAN);
  const exists = withoutAll.includes(option);
  const next = exists
    ? withoutAll.filter(item => item !== option)
    : [...withoutAll, option];
  return sortCoverageAreas(next);
}

/** Compact summary for the field trigger — names joined; CSS ellipsizes. */
export function formatCoverageAreasSummary(
  selected: readonly string[],
  emptyLabel = "انتخاب کنید"
): string {
  const ordered = sortCoverageAreas(selected);
  if (!ordered.length) return emptyLabel;
  return ordered.join("، ");
}
