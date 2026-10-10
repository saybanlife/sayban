import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const read = relative =>
  fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
const asModuleUrl = source =>
  `data:text/javascript;base64,${Buffer.from(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022
      }
    }).outputText
  ).toString("base64")}`;

const visitBookingUrl = asModuleUrl(
  read("components/reservation/visitBooking.ts")
);
const modelUrl = asModuleUrl(
  read("components/reservation/reservationDetailsModel.ts").replace(
    '"./visitBooking"',
    JSON.stringify(visitBookingUrl)
  )
);
const bookingTabsUrl = asModuleUrl(
  read("components/reservation/bookingTabs.ts").replace(
    '"./reservationDetailsModel"',
    JSON.stringify(modelUrl)
  )
);
const cardModelSource = read("components/home/homeStatusCardModel.ts")
  .replace(
    '"../reservation/reservationDetailsModel"',
    JSON.stringify(modelUrl)
  )
  .replace('"../reservation/bookingTabs"', JSON.stringify(bookingTabsUrl));
const cardModelUrl = asModuleUrl(cardModelSource);
const helperUrl = asModuleUrl(
  read("components/home/homeReservationStatus.ts")
    .replace(
      '"../reservation/reservationDetailsModel"',
      JSON.stringify(modelUrl)
    )
    .replace('"./homeStatusCardModel"', JSON.stringify(cardModelUrl))
);
const { selectLatestHomeReservations } = await import(helperUrl);
const { buildHomeStatusCard } = await import(cardModelUrl);
const model = await import(modelUrl);

const latest = selectLatestHomeReservations({
  result: [
    {
      id: 11,
      created_at: "2026-09-01T08:00:00Z",
      service_location: "home",
      service_id: null,
      status: "awaitingOffers"
    },
    {
      id: 14,
      created_at: "2026-09-03T08:00:00Z",
      service_location: "home",
      service_id: null,
      status: "offersReceived",
      offers_count: 3,
      user: { name: "مادربزرگ فاطمه" }
    },
    {
      id: 15,
      created_at: "2026-09-04T08:00:00Z",
      service_location: "home",
      service_id: 95,
      service_name: "تزریق آمپول",
      status: "pending"
    },
    {
      id: 12,
      created_at: "2026-09-02T08:00:00Z",
      service_code: "VISIT",
      status: "pending"
    },
    {
      id: 16,
      created_at: "2026-09-05T08:00:00Z",
      service_code: "visit",
      status: "confirmed",
      center_name: "خانهٔ سالمندان نورسته",
      center_phone: "02112345678"
    },
    {
      id: 17,
      created_at: "2026-09-06T08:00:00Z",
      service_location: "home",
      service_id: null,
      status: "completed"
    }
  ]
});

assert.deepEqual(
  latest.map(item => item.id),
  [16, 14, 12, 11],
  "all active nurse/visit reservations must show, newest first"
);
assert.deepEqual(
  selectLatestHomeReservations({ data: { result: [latest[1]] } }).map(
    item => item.id
  ),
  [14],
  "a missing visit must not create a placeholder card"
);
assert.deepEqual(
  selectLatestHomeReservations({
    result: [{ id: 99, service_id: 2, service_name: "تزریق آمپول" }]
  }),
  [],
  "ordinary service bookings must not show the status section"
);
assert.deepEqual(
  selectLatestHomeReservations({
    result: [
      {
        id: 20,
        created_at: "2026-09-07T08:00:00Z",
        service_location: "home",
        service_id: null,
        status: "completed"
      },
      {
        id: 19,
        created_at: "2026-09-06T08:00:00Z",
        service_location: "home",
        service_id: null,
        status: "awaitingOffers"
      }
    ]
  }).map(item => item.id),
  [19],
  "completed nurse requests must be skipped"
);

// Real API shape: visit service name without service_code
const realVisitPayload = {
  result: [
    {
      id: 364,
      created_at: "2026-10-06T12:25:46Z",
      status: "pending",
      service_id: 126,
      service_name: "رزرو وقت مشاوره و بازدید",
      service_code: null,
      service_location: null,
      center_id: 109
    },
    {
      id: 363,
      created_at: "2026-10-03T12:48:07Z",
      status: "awaitingSupport",
      service_id: 126,
      service_name: "رزرو وقت مشاوره و بازدید",
      service_code: null,
      center_id: 165
    }
  ]
};
const realVisits = selectLatestHomeReservations(realVisitPayload);
assert.deepEqual(
  realVisits.map(item => item.id),
  [364, 363],
  "both active visit bookings from API shape must appear on Home"
);
assert.equal(model.reservationFlow(realVisits[0]), "visit");
assert.deepEqual(
  model.buildReservationSteps(realVisits[0]).map(step => step.label),
  ["ثبت", "تأیید مرکز", "بازدید"]
);
assert.equal(model.buildReservationSteps(realVisits[0])[1].current, true);

const offersCard = buildHomeStatusCard(
  latest.find(item => item.id === 14)
);
assert.equal(offersCard.badge.tone, "action");
assert.match(offersCard.title, /۳ پیشنهاد/);
assert.equal(offersCard.actions[0]?.kind, "primary");
assert.equal(offersCard.actions[0]?.target, "offers");
assert.match(offersCard.contextLabel, /مادربزرگ فاطمه/);

const visitCard = buildHomeStatusCard(
  latest.find(item => item.id === 16)
);
assert.equal(visitCard.badge.label, "بازدید شما");
assert.equal(visitCard.actions.some(a => a.kind === "outlined"), true);

const attendance = buildHomeStatusCard({
  id: 30,
  service_location: "home",
  service_id: null,
  status: "trial_in_progress",
  staff_name: "مریم",
  trial_start_at: "2026-10-05T08:00:00+03:30"
});
assert.equal(attendance.actions[0]?.kind, "split");
assert.match(attendance.title, /مریم/);

const component = read("components/HomeHighRatedCenters.tsx");
assert.match(component, /url=\{PUBLIC_ROUTES\.reservation\}/);
assert.match(component, /latestReservations\.length > 0/);
assert.match(component, /<ItemBooking[\s\S]*?home[\s\S]*?item=\{reservation\}/);
assert.match(component, />وضعیت<\/h2>/);
assert.match(component, /SHOW_HIGH_RATED_CENTERS\s*=\s*false/);
assert.match(component, /SHOW_HIGH_RATED_CENTERS && items\.length > 0/);
assert.match(component, /onReservationChange=\{patchReservation\}/);
assert.match(component, /pay=\{\(\) => void goToPay\(reservation\)\}/);

const itemBooking = read("components/ItemBooking.tsx");
assert.match(itemBooking, /HomeStatusCard/);
assert.match(itemBooking, /if \(home && item\)/);

const cardUi = read("components/home/HomeStatusCard.tsx");
assert.match(cardUi, /buildHomeStatusCard/);
assert.match(cardUi, /report_attendance/);
assert.match(cardUi, /\/api\/reservations\//);

console.log("Home reservation status tests passed.");
