/**
 * Unit tests for components/reservation/bookingCalendar.ts
 *
 *   npx tsx scripts/test-booking-calendar.mjs
 */
import {
  isHolidayDate,
  normalizeHolidayDates
} from "../components/reservation/bookingCalendar.ts";

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

check("normalize: string array", normalizeHolidayDates(["2026-08-28", "2026-09-04"]), [
  "2026-08-28",
  "2026-09-04"
]);
check(
  "normalize: object rows",
  normalizeHolidayDates([{ date: "2026-08-31" }, { formatted: "2026-09-11" }]),
  ["2026-08-31", "2026-09-11"]
);
check("normalize: json string", normalizeHolidayDates('["2026-09-18"]'), ["2026-09-18"]);
check("normalize: empty", normalizeHolidayDates(null), []);
check("normalize: ignores junk", normalizeHolidayDates(["not-a-date", 42]), []);

check(
  "holiday: string array",
  isHolidayDate(["2026-08-28", "2026-09-04"], "2026-09-04"),
  true
);
check(
  "holiday: object rows",
  isHolidayDate([{ date: "2026-08-31" }], "2026-08-31"),
  true
);
check(
  "holiday: working day",
  isHolidayDate(["2026-08-28"], "2026-09-01"),
  false
);

console.log(
  failures === 0 ? "\nall booking-calendar checks passed" : `\n${failures} failure(s)`
);
process.exit(failures === 0 ? 0 : 1);
