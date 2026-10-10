/**
 * Nurse-offer confirm must treat panel TimeInput `"HH:mm"` as selected.
 *
 *   npx tsx scripts/test-nurse-offer-validation.mjs
 *
 * The previous check (`time.hour !== undefined`) failed after a real pick
 * because PanelTimePicker writes a canonical string, not `{hour, minute}`.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseTime, timeValueToState } from "../src/lib/datetime.ts";
import { dateStateToValue } from "../components/datetime/dateStateAdapter.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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

function offerTimeSelected(time) {
  return Boolean(parseTime(time));
}

function offerDateSelected(date) {
  return Boolean(dateStateToValue(date));
}

function legacyTimeSelected(time) {
  return time?.hour !== undefined && time?.minute !== undefined;
}

check("legacy: HH:mm looked unset", legacyTimeSelected("09:30"), false);
check("fix: HH:mm is selected", offerTimeSelected("09:30"), true);
check("fix: midnight is selected", offerTimeSelected("00:05"), true);
check(
  "fix: public {hour, minute} still selected",
  offerTimeSelected({ hour: 9, minute: 5 }),
  true
);
check(
  "fix: panel state object is selected",
  offerTimeSelected(timeValueToState("14:00")),
  true
);
check("fix: empty string is unset", offerTimeSelected(""), false);
check("fix: empty object is unset", offerTimeSelected({}), false);

check(
  "date: gregorian object still selected",
  offerDateSelected({ gregorian: { year: 2026, month: 9, day: 17 } }),
  true
);
check("date: API string is selected", offerDateSelected("2026-09-17"), true);
check("date: empty is unset", offerDateSelected({}), false);

const screens = [
  "components/plasmic/sayban/PlasmicReservationItem.tsx",
  "components/plasmic/sayban/PlasmicReservationItemMini.tsx"
];
for (const relative of screens) {
  const src = readFileSync(join(root, relative), "utf8");
  check(
    `${relative}: time uses parseTime`,
    /parseTime\(\$state\.timeInput\?\.time\)/.test(src),
    true
  );
  check(
    `${relative}: date uses dateStateToValue`,
    /dateStateToValue\(\s*\$state\.dateInput\?\.date/.test(src),
    true
  );
  check(
    `${relative}: no leftover hour check`,
    src.includes("time?.hour"),
    false
  );
}

const timeInput = readFileSync(join(root, "components/TimeInput.tsx"), "utf8");
check(
  "TimeInput panel publishes timeValueToState",
  timeInput.includes("timeValueToState(next)"),
  true
);

console.log(failures === 0 ? "\nall passed" : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
