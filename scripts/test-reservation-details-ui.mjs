import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const read = relative =>
  fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");

const modelSource = read("components/reservation/reservationDetailsModel.ts");
const visitBookingSource = read("components/reservation/visitBooking.ts");
const visitBookingOutput = ts.transpileModule(visitBookingSource, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 }
}).outputText;
const visitBookingUrl = `data:text/javascript;base64,${Buffer.from(visitBookingOutput).toString("base64")}`;
const modelOutput = ts.transpileModule(
  modelSource.replace('"./visitBooking"', JSON.stringify(visitBookingUrl)),
  {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 }
  }
).outputText;
const model = await import(
  `data:text/javascript;base64,${Buffer.from(modelOutput).toString("base64")}`
);

const freeReservation = {
  id: 21,
  status: "awaitingPayment",
  payment_status: "unpaid",
  final_price: 0
};
assert.equal(model.isFreeReservation(freeReservation), true);
assert.equal(model.isPaymentDone(freeReservation), true);
assert.equal(model.reservationPaymentStatusLabel(freeReservation), "رایگان");

const offerSteps = model.buildReservationSteps({
  id: 25,
  status: "offersReceived",
  service_location: "home",
  service_id: null
});
assert.deepEqual(offerSteps.map(step => step.label), ["ثبت", "پیشنهاد", "مصاحبه", "آزمایشی", "قرارداد"]);
assert.equal(offerSteps[1].current, true);
assert.equal(offerSteps[1].done, false);

const selectedNurseSteps = model.buildReservationSteps({
  id: 31,
  status: "awaitingPayment",
  service_location: "home",
  service_id: null,
  staff_name: "پرستار انتخاب‌شده"
});
assert.equal(selectedNurseSteps[1].done, true);
assert.equal(selectedNurseSteps[2].current, true);

const trialSteps = model.buildReservationSteps({
  id: 26,
  status: "paymentCompleted",
  lifecycle_stage: "trial_decision",
  service_location: "home",
  service_id: null,
  staff_name: "پرستار"
});
assert.equal(trialSteps[3].current, true);
assert.equal(trialSteps[3].done, false);
assert.equal(
  model.effectiveReservationStatus({ status: "canceled", lifecycle_stage: "awaiting_contract" }),
  "canceled",
  "terminal reservation status must override a stale lifecycle stage"
);

const visitSteps = model.buildReservationSteps({
  id: 27,
  status: "pending",
  service_code: "VISIT"
});
assert.deepEqual(visitSteps.map(step => step.label), [
  "ثبت",
  "تأیید مرکز",
  "بازدید"
]);
assert.equal(visitSteps[1].current, true);
assert.match(
  model.reservationStepCaption({
    id: 27,
    status: "pending",
    service_code: "VISIT"
  }),
  /مرحله ۲ از ۳ · تأیید مرکز/
);
const confirmedVisitSteps = model.buildReservationSteps({
  id: 32,
  status: "confirmed",
  service_id: 126,
  service_code: "VISIT",
  service_location: "center"
});
assert.equal(confirmedVisitSteps[1].done, true);
assert.equal(confirmedVisitSteps[2].current, true);

// Production visit rows often have service_name without service_code.
const namedVisitSteps = model.buildReservationSteps({
  id: 364,
  status: "pending",
  service_id: 126,
  service_name: "رزرو وقت مشاوره و بازدید",
  service_code: null,
  service_location: null
});
assert.equal(model.reservationFlow({
  id: 364,
  status: "pending",
  service_id: 126,
  service_name: "رزرو وقت مشاوره و بازدید",
  service_code: null
}), "visit");
assert.deepEqual(namedVisitSteps.map(step => step.label), [
  "ثبت",
  "تأیید مرکز",
  "بازدید"
]);
assert.equal(namedVisitSteps[1].current, true);
assert.match(
  model.reservationStepCaption({
    id: 364,
    status: "pending",
    service_name: "رزرو وقت مشاوره و بازدید"
  }),
  /مرحله ۲ از ۳ · تأیید مرکز/
);

const serviceSteps = model.buildReservationSteps({
  id: 28,
  status: "awaitingPayment",
  payment_status: "unpaid",
  final_price: 0,
  center_name: "مرکز"
});
assert.deepEqual(serviceSteps.map(step => step.label), ["ثبت", "پیشنهاد", "پرداخت", "خدمت", "نظر"]);
assert.equal(serviceSteps[2].done, true);
assert.equal(serviceSteps[3].current, true);

const oneTimeHomeService = {
  id: 29,
  status: "awaitingPayment",
  service_id: 95,
  service_code: null,
  service_name: "تزریق آمپول",
  service_location: "home",
  center_name: "مرکز خدمات پرستاری"
};
assert.equal(model.reservationFlow(oneTimeHomeService), "service");
assert.deepEqual(
  model.buildReservationSteps(oneTimeHomeService).map(step => step.label),
  ["ثبت", "پیشنهاد", "پرداخت", "خدمت", "نظر"]
);
assert.equal(model.buildReservationSteps(oneTimeHomeService)[2].current, true);
assert.match(
  model.reservationStepCaption(oneTimeHomeService),
  /مرحله ۳ از ۵ · پرداخت/
);
const completedServiceSteps = model.buildReservationSteps({
  ...oneTimeHomeService,
  status: "completed",
  payment_status: "paid"
});
assert.equal(completedServiceSteps[3].done, true);
assert.equal(completedServiceSteps[4].current, true);
assert.deepEqual(
  model.buildNurseSteps({
    id: 40,
    status: "offersReceived",
    service_location: "home",
    service_id: null
  }).map(step => step.label),
  ["ثبت", "پیشنهاد", "مصاحبه", "آزمایشی", "قرارداد"]
);
assert.equal(
  model.reservationFlow({
    id: 30,
    status: "awaitingOffers",
    service_location: "home",
    service_id: null
  }),
  "nurse"
);

assert.deepEqual(model.parseCancellationPolicy('{"full_refund_before_hours":12}'), {
  full_refund_before_hours: 12
});

const page = read("components/ReservationDetails.tsx");
const stateUi = read("components/ReservationStateDetails.tsx");
const api = read("src/pages/api/reservations/[id].ts");
const service = read("src/lib/server/reservationLifecycleService.ts");
const migration = read("scripts/sql/reservation_lifecycle.sql");
const rollback = read("scripts/sql/reservation_lifecycle_rollback.sql");

assert.match(page, /reservationDetailsUrl\(reservationId\)/);
assert.match(page, /resolveApiUrl\(PUBLIC_ROUTES\.reservation\)/, "legacy fallback must remain");
assert.match(page, /<ReservationStateDetails/);
assert.match(stateUi, /reservationLifecycleUrl/);
assert.match(stateUi, /reservationDetailsUrl/);
assert.doesNotMatch(
  stateUi,
  /fetch\(`\/api\/reservations\/\$\{/,
  "status actions must not call same-origin /api/reservations/:id"
);
assert.match(stateUi, /interview_options/);
assert.match(stateUi, /trial_total_price/);
assert.match(stateUi, /center_phone/);
assert.match(stateUi, /timelineCompact|مراحل رزرو/);
assert.match(stateUi, /در انتظار پیشنهاد مراکز/);
assert.match(stateUi, /پرداخت هزینه دو روز آزمایشی/);
assert.match(stateUi, /وقت بستن قرارداد/);
assert.match(stateUi, /منتظر تأیید مرکز/);
assert.match(stateUi, /badgeAction|اقدام شما/);

const lifecycleApi = read("components/reservation/reservationLifecycleApi.ts");
assert.match(lifecycleApi, /PUBLIC_ROUTES\.reservationDetails/);
assert.match(lifecycleApi, /PUBLIC_ROUTES\.reservationLifecycle/);
assert.match(lifecycleApi, /resolveApiUrl/);
const routes = read("src/lib/apiRoutes.ts");
assert.match(routes, /reservationDetails:\s*"reservations\/details"/);
assert.match(routes, /reservationLifecycle:\s*"reservations\/lifecycle"/);
const offersUi = read("components/NurseOffersList.tsx");
assert.match(offersUi, /انتخاب برای مصاحبه/);
assert.match(offersUi, /جزئیات بیشتر/);
assert.match(page, /join\(" - "\)/);
const itemBooking = read("components/plasmic/sayban/PlasmicItemBooking.tsx");
assert.match(itemBooking, /reservationStepCaption/);
assert.match(itemBooking, /progressCaption/);
assert.match(api, /verifyReservationAccess/);
assert.match(api, /status >= 500 \? "Request failed"/);
assert.match(service, /WHERE r\.id = \? AND r\.user_id = \?/);
assert.match(service, /Interview option is not available/);
assert.match(service, /Contract cannot be closed at this stage/);
assert.match(migration, /CREATE TABLE IF NOT EXISTS `reservations__lifecycle`/);
assert.match(rollback, /DROP TABLE IF EXISTS `reservations__lifecycle`/);

console.log("Reservation details lifecycle UI tests passed.");
