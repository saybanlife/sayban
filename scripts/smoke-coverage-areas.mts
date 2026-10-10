/**
 * Unit smoke for coverage-area toggle/summary helpers.
 *   node --import tsx scripts/smoke-coverage-areas.mts
 */
import assert from "node:assert/strict";
import {
  COVERAGE_ALL_TEHRAN,
  COVERAGE_KARAJ,
  formatCoverageAreasSummary,
  toggleCoverageArea
} from "../components/centerPanel/coverageAreasModel";

let selected = toggleCoverageArea([], COVERAGE_ALL_TEHRAN);
assert.deepEqual(selected, [COVERAGE_ALL_TEHRAN]);

selected = toggleCoverageArea(selected, "منطقه ۱");
assert.deepEqual(selected, ["منطقه ۱"]);

selected = toggleCoverageArea(selected, COVERAGE_KARAJ);
assert.deepEqual(selected, [COVERAGE_KARAJ, "منطقه ۱"]);

selected = toggleCoverageArea(selected, COVERAGE_ALL_TEHRAN);
assert.deepEqual(selected, [COVERAGE_ALL_TEHRAN, COVERAGE_KARAJ]);

assert.equal(
  formatCoverageAreasSummary(selected),
  "سراسر تهران، کرج"
);
assert.equal(formatCoverageAreasSummary([]), "انتخاب کنید");
assert.doesNotMatch(formatCoverageAreasSummary(selected), /\d+\s*مورد/);

console.log("smoke-coverage-areas: ok");
