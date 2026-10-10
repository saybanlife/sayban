/**
 * Unit tests for components/reservation/visitBooking.ts
 *
 *   npx tsx scripts/test-visit-booking.mjs
 *
 * These cover every value that previously produced a '0000-00-00 00:00:00'
 * reservation, so a regression here fails loudly instead of in the database.
 */
import {
  VISIT_BOOKING_HEADING,
  VISIT_SERVICE_CODE,
  buildHolidayQueryParams,
  buildReservationPayload,
  buildSlotRangeQueryParams,
  buildSlotQueryParams,
  canConfirmBooking,
  findFirstAvailableBookingSlot,
  findFirstAvailableBookingDay,
  formatReservationPostTime,
  isValidBookingDate,
  isValidBookingSlot,
  isVisitService,
  normalizePatientId,
  normalizeSlotTime,
  parseReservationDate,
  reservationDisplayTime,
  reservationTitle,
  visitService
} from "../components/reservation/visitBooking.ts";

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

const CENTER = "a87ff679a2f3e71d9181a67b7542122c";
const SLOT = { slot_start: "08:05", slot_end: "08:35", status: "available" };

check(
  "range params: visit",
  buildSlotRangeQueryParams({
    centerId: CENTER,
    service: visitService(),
    dateFrom: "2026-10-09",
    dateTo: "2026-11-21"
  }),
  {
    service_code: "VISIT",
    center_id: CENTER,
    date_from: "2026-10-09",
    date_to: "2026-11-21"
  }
);
check(
  "range params: rejects reverse range",
  buildSlotRangeQueryParams({
    centerId: CENTER,
    service: visitService(),
    dateFrom: "2026-11-21",
    dateTo: "2026-10-09"
  }),
  null
);
check(
  "bulk availability: earliest valid day and time",
  findFirstAvailableBookingDay([
    { date: "2026-10-11", result: [{ period: "noon", slots: [{ slot_start: "13:00", slot_end: "13:30", status: "available" }] }] },
    { date: "2026-10-10", result: [{ period: "morning", slots: [{ slot_start: "09:00", slot_end: "09:30", status: "booked" }] }] },
    { date: "2026-10-12", result: [{ period: "morning", slots: [{ slot_start: "08:00", slot_end: "08:30", status: "available" }] }] }
  ]),
  {
    date: "2026-10-11",
    groups: [{ period: "noon", slots: [{ slot_start: "13:00", slot_end: "13:30", status: "available" }] }],
    period: "noon",
    slot: { slot_start: "13:00", slot_end: "13:30", status: "available" }
  }
);

// --- date validation: the exact values the picker used to leak ---------------
check("date: valid", isValidBookingDate("2026-09-01"), true);
check("date: undefined", isValidBookingDate(undefined), false);
check("date: zero number", isValidBookingDate(0), false);
check("date: string zero", isValidBookingDate("0"), false);
check("date: zero date", isValidBookingDate("0000-00-00"), false);
check("date: NaN parts", isValidBookingDate("NaN-NaN-NaN"), false);
check("date: jalali year", isValidBookingDate("1405-06-10"), false);
check("date: impossible day", isValidBookingDate("2026-02-31"), false);
check("date: with time", isValidBookingDate("2026-09-01 08:05"), false);

// --- slot validation --------------------------------------------------------
check("slot: valid", isValidBookingSlot(SLOT), true);
check("slot: empty string", isValidBookingSlot(""), false);
check("slot: empty object", isValidBookingSlot({}), false);
check("slot: undefined start", isValidBookingSlot({ slot_end: "08:35" }), false);
check(
  "slot: booked",
  isValidBookingSlot({ ...SLOT, status: "reserved" }),
  false
);
check("time: pads", normalizeSlotTime("8:5"), null);
check("time: hh:mm", normalizeSlotTime("08:05"), "08:05:00");
check("time: hh:mm:ss", normalizeSlotTime("08:05:30"), "08:05:30");
check("time: out of range", normalizeSlotTime("25:00"), null);

// --- confirm gate -----------------------------------------------------------
check("confirm: both set", canConfirmBooking("2026-09-01", SLOT), true);
check("confirm: no date", canConfirmBooking(undefined, SLOT), false);
check("confirm: no slot", canConfirmBooking("2026-09-01", ""), false);
check("confirm: neither", canConfirmBooking(0, {}), false);

// --- first available slot ---------------------------------------------------
const FIRST_AVAILABLE = {
  period: "morning",
  slot: { slot_start: "08:30", slot_end: "09:00", status: "available" }
};
check(
  "first slot: earliest available across periods",
  findFirstAvailableBookingSlot([
    {
      period: "noon",
      slots: [{ slot_start: "13:00", slot_end: "13:30", status: "available" }]
    },
    {
      period: "morning",
      slots: [
        { slot_start: "08:00", slot_end: "08:30", status: "reserved" },
        FIRST_AVAILABLE.slot
      ]
    }
  ]),
  FIRST_AVAILABLE
);
check(
  "first slot: none available",
  findFirstAvailableBookingSlot([
    {
      period: "morning",
      slots: [{ slot_start: "08:00", slot_end: "08:30", status: "reserved" }]
    }
  ]),
  null
);
check("first slot: invalid response", findFirstAvailableBookingSlot(null), null);

// --- companion patient id ---------------------------------------------------
check("patient: null for self", normalizePatientId(null), null);
check("patient: zero for self", normalizePatientId(0), null);
check("patient: string zero", normalizePatientId("0"), null);
check("patient: empty string", normalizePatientId(""), null);
check("patient: companion id", normalizePatientId(24), 24);
check("patient: string id", normalizePatientId("24"), 24);

// --- payload ----------------------------------------------------------------
check("service: visit flagged", isVisitService(visitService()), true);
check(
  "service: visit flagged by name",
  isVisitService({ name: "رزرو وقت بازدید" }),
  true
);
check(
  "service: production visit name flagged",
  isVisitService({ name: "رزرو وقت مشاوره و بازدید" }),
  true
);
check("service: clinical not flagged", isVisitService({ id: 7, name: "فیزیوتراپی" }), false);

check(
  "payload: visit booking",
  buildReservationPayload({
    centerId: CENTER,
    service: visitService(),
    date: "2026-09-01",
    slot: SLOT,
    patientId: null
  }),
  {
    center_id: CENTER,
    service_id: null,
    service_code: VISIT_SERVICE_CODE,
    service_location: "center",
    start_time: "2026-09-01 08:05:00",
    end_time: "2026-09-01 08:35:00",
    final_price: 0,
    patient_id: null
  }
);

check(
  "payload: visit booking with companion",
  buildReservationPayload({
    centerId: CENTER,
    service: visitService(),
    date: "2026-09-01",
    slot: SLOT,
    patientId: 24
  }),
  {
    center_id: CENTER,
    service_id: null,
    service_code: VISIT_SERVICE_CODE,
    service_location: "center",
    start_time: "2026-09-01 08:05:00",
    end_time: "2026-09-01 08:35:00",
    final_price: 0,
    patient_id: 24
  }
);

check(
  "payload: clinical service keeps its id and price",
  buildReservationPayload({
    centerId: CENTER,
    service: { id: 35, name: "فیزیوتراپی", final_price: 250000 },
    date: "2026-09-01",
    slot: SLOT,
    patientId: 12
  }),
  {
    center_id: CENTER,
    service_id: 35,
    service_location: "center",
    start_time: "2026-09-01 08:05:00",
    end_time: "2026-09-01 08:35:00",
    final_price: 250000,
    patient_id: 12
  }
);

for (const [label, date] of [
  ["undefined date", undefined],
  ["zero date", 0],
  ["zero string", "0000-00-00"],
  ["jalali date", "1405-06-10"]
]) {
  check(
    `payload: refuses ${label}`,
    buildReservationPayload({
      centerId: CENTER,
      service: visitService(),
      date,
      slot: SLOT
    }),
    null
  );
}
check(
  "payload: refuses missing slot",
  buildReservationPayload({
    centerId: CENTER,
    service: visitService(),
    date: "2026-09-01",
    slot: ""
  }),
  null
);
check(
  "payload: refuses missing center",
  buildReservationPayload({
    centerId: "",
    service: visitService(),
    date: "2026-09-01",
    slot: SLOT
  }),
  null
);
check(
  "payload: refuses clinical service with no id",
  buildReservationPayload({
    centerId: CENTER,
    service: { name: "فیزیوتراپی" },
    date: "2026-09-01",
    slot: SLOT
  }),
  null
);

// --- slot + holiday query params -------------------------------------------
check(
  "slots: visit queries by code + center",
  buildSlotQueryParams({
    centerId: CENTER,
    service: visitService(),
    date: "2026-09-01"
  }),
  { service_code: "VISIT", center_id: CENTER, date: "2026-09-01" }
);
check(
  "slots: clinical queries by service id",
  buildSlotQueryParams({
    centerId: CENTER,
    service: { id: 35 },
    date: "2026-09-01"
  }),
  { id: "35", date: "2026-09-01" }
);
check(
  "slots: no fetch without a valid date",
  buildSlotQueryParams({
    centerId: CENTER,
    service: visitService(),
    date: undefined
  }),
  null
);
check(
  "holidays: visit queries by center",
  buildHolidayQueryParams({
    centerId: CENTER,
    service: visitService(),
    year: 1405,
    month: 6
  }),
  { year: "1405", month: "6", center_id: CENTER }
);
check(
  "holidays: clinical queries by service id",
  buildHolidayQueryParams({
    centerId: CENTER,
    service: { id: 35 },
    year: 1405,
    month: 6
  }),
  { year: "1405", month: "6", id: "35" }
);

// --- display ----------------------------------------------------------------
check("parse: valid", parseReservationDate("2026-09-01 08:05:00")?.getFullYear(), 2026);
check("parse: zero date", parseReservationDate("0000-00-00 00:00:00"), null);
check("parse: null", parseReservationDate(null), null);
check("parse: empty", parseReservationDate(""), null);
check("parse: garbage", parseReservationDate("undefined 08:00"), null);
check(
  "posttime: visit wall clock",
  formatReservationPostTime("2026-09-01 09:40:00"),
  {
    year: 2026,
    month: 9,
    day: 1,
    hour: 9,
    minute: 40,
    second: 0
  }
);
check("posttime: zero date", formatReservationPostTime("0000-00-00 00:00:00"), null);

// Reservation lists used to add +3:30 to the stored Tehran wall clock.
check(
  "display: wall clock stays untouched",
  reservationDisplayTime("2026-09-17 13:40:00"),
  { year: 2026, month: 9, day: 17, hour: 13, minute: 40, second: 0 }
);
check(
  "display: ISO wall clock stays untouched",
  reservationDisplayTime("2026-09-17T13:40:00"),
  { year: 2026, month: 9, day: 17, hour: 13, minute: 40, second: 0 }
);
check(
  "display: fractional seconds stay untouched",
  reservationDisplayTime("2026-09-17 13:40:00.000"),
  { year: 2026, month: 9, day: 17, hour: 13, minute: 40, second: 0 }
);
check(
  "display: UTC value converts to Tehran",
  reservationDisplayTime("2026-09-17T10:10:00.000Z"),
  { year: 2026, month: 9, day: 17, hour: 13, minute: 40, second: 0 }
);
check("display: zero date", reservationDisplayTime("0000-00-00 00:00:00"), null);
check("display: missing", reservationDisplayTime(null), null);
check("display: garbage", reservationDisplayTime("undefined 08:00"), null);

check(
  "title: visit",
  reservationTitle({ serviceCode: "VISIT", serviceName: "فیزیوتراپی" }),
  VISIT_BOOKING_HEADING
);
check(
  "title: clinical",
  reservationTitle({ serviceName: "فیزیوتراپی" }),
  "فیزیوتراپی"
);
check(
  "title: home care",
  reservationTitle({ serviceLocation: "home" }),
  "درخواست پرستار"
);

console.log(
  failures === 0 ? "\nall visit-booking checks passed" : `\n${failures} failure(s)`
);
process.exit(failures === 0 ? 0 : 1);
