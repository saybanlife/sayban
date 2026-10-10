import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const read = relative =>
  fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");

const modelSource = read("components/reservation/reservationDetailsModel.ts");
const modelOutput = ts.transpileModule(modelSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022
  }
}).outputText;
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

assert.equal(
  model.isFreeReservation({
    id: 22,
    payment_status: "unpaid",
    payment: { final_price: "۰" }
  }),
  true
);
assert.equal(
  model.reservationPaymentStatusLabel({
    id: 23,
    payment_status: "unpaid",
    final_price: 150000
  }),
  "پرداخت نشده"
);
assert.equal(model.isFreeReservation({ id: 24, payment_status: "unpaid" }), false);
assert.equal(
  model.isFreeReservation({
    id: 27,
    final_price: 150000,
    service: { final_price: 0 }
  }),
  false,
  "the reservation total must take precedence over a nested service price"
);

const pendingSteps = model.buildReservationSteps({
  id: 25,
  status: "awaitingPayment",
  payment_status: "unpaid",
  final_price: 150000,
  service_location: "center"
});
assert.deepEqual(
  pendingSteps.map(step => [step.label, step.done]),
  [
    ["تکمیل رزرو", true],
    ["پرداخت", false],
    ["تأیید مرکز", false]
  ]
);

const freeSteps = model.buildReservationSteps({
  id: 26,
  status: "awaitingPayment",
  payment_status: "unpaid",
  final_price: 0,
  service_location: "center"
});
assert.deepEqual(
  freeSteps.map(step => [step.label, step.done]),
  [
    ["تکمیل رزرو", true],
    ["پرداخت", true],
    ["تأیید مرکز", false]
  ]
);

const css = read("components/ReservationDetails.module.css");
assert.match(css, /\.timeline[\s\S]*pointer-events:\s*none/);
assert.match(css, /\.stepDone[\s\S]*--token-ee2TuxDknsJj/);
assert.match(css, /\.stepCurrent\s*\{[\s\S]*color:\s*#9a9a9a/);
assert.match(css, /\.stepLineDone[\s\S]*--token-ee2TuxDknsJj/);
assert.match(css, /@media \(max-width:\s*500px\)/);

const component = read("components/ReservationDetails.tsx");
assert.match(component, /aria-current=\{step\.current \? "step" : undefined\}/);
assert.match(component, /<ReservationStepIcon stepKey=\{step\.key\}/);
assert.match(component, /steps\[index - 1\]\?\.done && step\.done/);
assert.match(component, /\{paymentLabel\}/);
assert.match(component, /!free\s*&&/);

console.log("Reservation details UI and free-payment tests passed.");
