/**
 * Focused smoke checks for nursing overview facts (no network).
 *   node --import tsx scripts/smoke-nursing-overview-facts.mts
 */
import {
  EMPTY_OVERVIEW_FACTS,
  factsFromCenterResult,
  overviewDisplayRows,
  overviewFactsPayload,
  validateOverviewFacts
} from "../components/centerPanel/centerFactsSchema";
import { getCenterMetaItems } from "../components/centerPage/centerProfileFields";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const nursing = {
  ...EMPTY_OVERVIEW_FACTS,
  center_type: "روزانه",
  care_domain: "پرستاری",
  admission_gender: "فقط خانم‌ها",
  founded_year: "1390",
  care_staff_count: "10",
  active_staff_count: "12",
  min_work_experience_value: "6",
  min_work_experience_unit: "ماه",
  dispatch_tehran_districts: ["سراسر تهران"] as const,
  dispatch_lead_time: "کمتر از ۲ ساعت",
  urgent_dispatch: "بله، شبانه‌روزی",
  activity_days: ["شنبه", "یکشنبه"] as const,
  response_hours_start: "08:00",
  response_hours_end: "20:00"
};

assert(validateOverviewFacts(nursing) === null, "nursing form should validate");
const payload = overviewFactsPayload(nursing);
assert(payload.total_capacity === null, "nursing payload clears capacity");
assert(payload.active_staff_count === 12, "active staff mapped");
assert(payload.dispatch_tehran_districts === "all_tehran", "districts mapped");
assert(payload.min_work_experience_unit === "months", "experience unit mapped");

const nursingRows = overviewDisplayRows(nursing);
assert(
  !nursingRows.some(r => r.key === "total_capacity"),
  "nursing display hides capacity"
);
assert(
  nursingRows.some(r => r.key === "active_staff_count"),
  "nursing display shows active staff"
);

const elderly = {
  ...EMPTY_OVERVIEW_FACTS,
  center_type: "شبانه‌روزی",
  care_domain: "سالمندان",
  admission_gender: "فقط آقایان",
  total_capacity: "40",
  founded_year: "1380",
  care_staff_count: "8"
};
assert(validateOverviewFacts(elderly) === null, "elderly form should validate");
const elderlyRows = overviewDisplayRows(elderly);
assert(
  elderlyRows.some(r => r.key === "total_capacity"),
  "elderly display keeps capacity"
);
assert(
  !elderlyRows.some(r => r.key === "active_staff_count"),
  "elderly display hides nursing fields"
);

const publicNursing = getCenterMetaItems({
  care_domain: "nursing",
  active_staff_count: 7,
  min_work_experience_value: 2,
  min_work_experience_unit: "years",
  dispatch_tehran_districts: "d3,d5",
  dispatch_lead_time: "next_day",
  urgent_dispatch: "daytime_only",
  activity_days: "sat,fri",
  response_hours_start: "09:00",
  response_hours_end: "18:00",
  founded_year: 1399,
  care_staff_count: 4,
  total_capacity: 99
} as never);
assert(
  !publicNursing.some(i => i.key === "capacity"),
  "public nursing meta hides capacity even if DB has it"
);
assert(
  publicNursing.some(i => i.key === "active_staff_count"),
  "public nursing meta shows active staff"
);

const loaded = factsFromCenterResult({
  care_domain: "nursing",
  center_type: "day_care",
  admission_gender: "women",
  active_staff_count: 5,
  min_work_experience_value: 3,
  min_work_experience_unit: "years",
  dispatch_tehran_districts: "all_tehran,d1",
  dispatch_lead_time: "same_day",
  urgent_dispatch: "no",
  activity_days: "sat,fri",
  response_hours_start: "09:00",
  response_hours_end: "17:00",
  founded_year: 1400,
  care_staff_count: 4
});
assert(
  loaded.overview.min_work_experience_unit === "سال",
  "loads experience unit to FA"
);
assert(
  loaded.overview.dispatch_tehran_districts.includes("سراسر تهران"),
  "loads districts to FA"
);
assert(
  !loaded.overview.dispatch_tehran_districts.includes("منطقه ۱"),
  "all-tehran drops individual districts on load"
);

const withKaraj = factsFromCenterResult({
  care_domain: "nursing",
  dispatch_tehran_districts: "karaj,d2,all_tehran"
});
assert(
  JSON.stringify([...withKaraj.overview.dispatch_tehran_districts].sort()) ===
    JSON.stringify(["سراسر تهران", "کرج"].sort()),
  "karaj stays with all-tehran; districts drop"
);

const mixed = factsFromCenterResult({
  care_domain: "nursing",
  dispatch_tehran_districts: "karaj,d1,d22"
});
assert(
  JSON.stringify(mixed.overview.dispatch_tehran_districts) ===
    JSON.stringify(["کرج", "منطقه ۱", "منطقه ۲۲"]),
  "karaj plus districts load in option order"
);

const karajPayload = overviewFactsPayload({
  ...nursing,
  dispatch_tehran_districts: ["کرج", "منطقه ۳"]
});
assert(
  karajPayload.dispatch_tehran_districts === "karaj,d3",
  "karaj and district map to english set"
);

console.log("smoke-nursing-overview-facts: ok");
