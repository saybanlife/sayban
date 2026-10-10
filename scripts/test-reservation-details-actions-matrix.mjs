/**
 * Matrix: which actions the details UI exposes per flow/status.
 *
 *   node scripts/test-reservation-details-actions-matrix.mjs
 */
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

const stateUi = read("components/ReservationStateDetails.tsx");

// Nurse waiting actions
assert.match(stateUi, /لغو درخواست/);
assert.match(stateUi, /ویرایش درخواست/);
assert.match(stateUi, /انتخاب برای مصاحبه|NurseOffersList/);
assert.match(stateUi, /تأیید زمان مصاحبه/);
assert.match(stateUi, /پرداخت از درگاه/);
assert.match(stateUi, /report_attendance/);
assert.match(stateUi, /trial_decision/);
assert.match(stateUi, /close_contract/);

// Visit actions
assert.match(stateUi, /تغییر وقت/);
assert.match(stateUi, /حذف وقت/);
assert.match(stateUi, /مسیر مرکز/);

// Service pay + cancel
assert.match(stateUi, /showServicePay/);
assert.match(stateUi, /showNursePay/);
assert.match(stateUi, /لغو خدمت/);
assert.match(stateUi, /لغو بازدید/);
assert.match(stateUi, /پرداخت از درگاه/);

const cases = [
  {
    name: "visit pending",
    reservation: {
      id: 1,
      status: "pending",
      service_id: 126,
      service_code: "VISIT",
      service_name: "رزرو وقت بازدید"
    },
    expectCancel: true,
    flow: "visit",
    stage: "awaitingCenter"
  },
  {
    name: "visit confirmed",
    reservation: {
      id: 2,
      status: "confirmed",
      service_id: 126,
      service_code: "VISIT"
    },
    expectCancel: true,
    flow: "visit",
    stage: "visitScheduled"
  },
  {
    name: "nurse awaitingOffers",
    reservation: {
      id: 3,
      status: "awaitingOffers",
      service_location: "home",
      service_id: null
    },
    expectCancel: true,
    flow: "nurse"
  },
  {
    name: "nurse awaitingSupport",
    reservation: {
      id: 4,
      status: "awaitingSupport",
      service_location: "home",
      service_id: null
    },
    expectCancel: true,
    flow: "nurse"
  },
  {
    name: "service awaitingPayment",
    reservation: {
      id: 5,
      status: "awaitingPayment",
      payment_status: "unpaid",
      final_price: 200000,
      service_id: 95,
      service_name: "تزریق",
      service_location: "home",
      center_name: "مرکز"
    },
    expectCancel: true,
    flow: "service",
    expectPay: true
  },
  {
    name: "service completed",
    reservation: {
      id: 6,
      status: "completed",
      service_id: 95,
      service_name: "تزریق",
      center_name: "مرکز"
    },
    expectCancel: false,
    flow: "service"
  },
  {
    name: "canceled",
    reservation: { id: 7, status: "canceled", service_id: 126, service_code: "VISIT" },
    expectCancel: false,
    flow: "visit",
    stage: "cancelled"
  }
];

for (const item of cases) {
  assert.equal(
    model.reservationFlow(item.reservation),
    item.flow,
    `${item.name} flow`
  );
  assert.equal(
    model.canCancelReservation(item.reservation),
    item.expectCancel,
    `${item.name} cancel`
  );
  if (item.stage) {
    assert.equal(
      model.visitStage(item.reservation),
      item.stage,
      `${item.name} visit stage`
    );
  }
  if (item.expectPay) {
    assert.equal(model.isPaymentDone(item.reservation), false, `${item.name} unpaid`);
  }
}

console.log("Reservation details action matrix passed.");
