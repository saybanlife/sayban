/**
 * Unit tests for src/lib/datetime.ts
 *
 *   npx tsx scripts/test-datetime.mjs
 *
 * Each case below is a value that a picker previously produced or accepted and
 * that reached the API in a broken form, so a regression fails here rather than
 * in the database.
 */
import {
  addDays,
  buildDate,
  buildTime,
  compareDates,
  formatJalaliLong,
  formatJalaliShort,
  formatTimeForDisplay,
  fromJalali,
  isTimeRangeValid,
  isValidDate,
  isValidTime,
  jalaliMonthLength,
  joinDateTime,
  nextAnnualOccurrence,
  parseDate,
  parseTime,
  splitDateTime,
  timeValueToState,
  timeToMinutes,
  toAsciiDigits,
  toJalali,
  today,
  weekdayKey,
  withSeconds
} from "../src/lib/datetime.ts";

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

// --- digits -----------------------------------------------------------------
check("ascii: persian digits", toAsciiDigits("۰۷:۳۰"), "07:30");
check("ascii: arabic-indic digits", toAsciiDigits("٠٧:٣٠"), "07:30");
check("ascii: already ascii", toAsciiDigits("07:30"), "07:30");

// --- time: the TimeWeek padding bug -----------------------------------------
check("time: pads single digits", buildTime(9, 5), "09:05");
check("time: midnight is a real value", buildTime(0, 0), "00:00");
check("time: parses legacy '9:5'", parseTime("9:5"), "09:05");
check("time: drops seconds from API value", parseTime("08:00:00"), "08:00");
check("time: parses persian digits", parseTime("۰۷:۳۰"), "07:30");
check("time: parses {hour, minute} object", parseTime({ hour: 9, minute: 5 }), "09:05");
check("time: object with hour 0", parseTime({ hour: 0, minute: 0 }), "00:00");
check("time: rejects out of range", buildTime(24, 0), "");
check("time: rejects garbage", parseTime("abc"), "");
check("time: empty stays empty", parseTime(""), "");
check("time: validity", [isValidTime("09:05"), isValidTime("9:5")], [true, false]);
check("time: minutes since midnight", timeToMinutes("09:05"), 545);
check("time: with seconds", withSeconds("09:05"), "09:05:00");
check("time: rtl display", formatTimeForDisplay("09:05"), "05 : 09");
check(
  "time: state from HH:mm keeps hour 0",
  timeValueToState("00:05"),
  { hour: 0, minute: 5, text: "00:05" }
);
check("time: empty state is {}", timeValueToState(""), {});
check(
  "time: nurse-offer HH:mm counts as selected",
  Boolean(parseTime("09:30")),
  true
);
check(
  "time: nurse-offer leftover {hour,minute} still selected",
  Boolean(parseTime({ hour: 9, minute: 5 })),
  true
);
check("time: nurse-offer empty is unset", Boolean(parseTime({})), false);

// --- time ranges: TimeWeek accepted end < start ------------------------------
check("range: valid", isTimeRangeValid("08:00", "17:00"), true);
check("range: end before start", isTimeRangeValid("17:00", "08:00"), false);
check("range: equal is not a range", isTimeRangeValid("08:00", "08:00"), false);
check("range: invalid input", isTimeRangeValid("", "17:00"), false);

// --- date: the proposed_date padding bug ------------------------------------
check("date: pads", buildDate(2026, 3, 7), "2026-03-07");
check("date: parses legacy '2026-3-7'", parseDate("2026-3-7"), "2026-03-07");
check("date: tolerates trailing time", parseDate("2026-03-07 09:00:00"), "2026-03-07");
check("date: rejects 31 April", buildDate(2026, 4, 31), "");
check("date: rejects 29 Feb in common year", buildDate(2026, 2, 29), "");
check("date: accepts 29 Feb in leap year", buildDate(2028, 2, 29), "2028-02-29");
check("date: validity", [isValidDate("2026-03-07"), isValidDate("2026-3-7")], [true, false]);
check("date: ordering", compareDates("2026-03-07", "2026-03-08"), -1);
check("date: add days across month", addDays("2026-03-31", 1), "2026-04-01");
check("date: subtract days across year", addDays("2026-01-01", -1), "2025-12-31");

// --- jalali round trip ------------------------------------------------------
check("jalali: gregorian to jalali", toJalali("2026-03-07"), { jy: 1404, jm: 12, jd: 16 });
check("jalali: jalali to gregorian", fromJalali(1404, 12, 16), "2026-03-07");
check("jalali: nowruz", fromJalali(1405, 1, 1), "2026-03-21");
check("jalali: 30 Esfand rejected in common year", fromJalali(1404, 12, 30), "");
check("jalali: month length leap Esfand", jalaliMonthLength(1403, 12), 30);
check("jalali: month length common Esfand", jalaliMonthLength(1404, 12), 29);
check("jalali: long format", formatJalaliLong("2026-03-07"), "۱۶ اسفند ۱۴۰۴");
check("jalali: short format", formatJalaliShort("2026-03-07"), "۱۴۰۴/۱۲/۱۶");

// --- today: must not use the UTC day ----------------------------------------
// 00:30 Tehran on 7 March is still 6 March in UTC; `toISOString()` returned the
// wrong day for every user in a positive offset.
const earlyMorning = new Date(2026, 2, 7, 0, 30, 0);
check("today: local day, not UTC day", today(earlyMorning), "2026-03-07");

// --- annual occurrence: the birthday off-by-one-year ------------------------
const march7 = new Date(2026, 2, 7, 14, 0, 0);
check(
  "annual: today counts as upcoming",
  nextAnnualOccurrence("1990-03-07", march7),
  "2026-03-07"
);
check(
  "annual: past date rolls to next year",
  nextAnnualOccurrence("1990-03-06", march7),
  "2027-03-06"
);
check(
  "annual: future date stays this year",
  nextAnnualOccurrence("1990-12-25", march7),
  "2026-12-25"
);

// --- combined ---------------------------------------------------------------
check("join: full datetime", joinDateTime("2026-03-07", "09:05"), "2026-03-07 09:05:00");
check("join: refuses half-filled", joinDateTime("2026-03-07", ""), "");
check("join: refuses bad date", joinDateTime("undefined", "09:05"), "");
check("split: round trip", splitDateTime("2026-03-07 09:05:00"), {
  date: "2026-03-07",
  time: "09:05"
});
check("weekday: matches API key", weekdayKey("2026-03-07"), "Sat");

console.log(failures === 0 ? "\nall passed" : `\n${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
