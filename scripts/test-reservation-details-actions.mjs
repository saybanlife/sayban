/**
 * Reservation details operational buttons / cancelability parity.
 *
 *   node scripts/test-reservation-details-actions.mjs
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

const cancelable = [
  "draft",
  "registered",
  "pending",
  "awaitingOffers",
  "awaitingSupport",
  "offersReceived",
  "nurseSelected",
  "awaitingPayment",
  "paymentCompleted",
  "confirmed",
  "finalConfirmed",
  "readyForDispatch"
];
for (const status of cancelable) {
  assert.equal(
    model.canCancelReservation({ status }),
    true,
    `should cancel ${status}`
  );
}
for (const status of ["canceled", "rejected", "inProgress", "completed", "refunded"]) {
  assert.equal(
    model.canCancelReservation({ status }),
    false,
    `must not cancel ${status}`
  );
}

const stateUi = read("components/ReservationStateDetails.tsx");
assert.match(stateUi, /canCancelReservation/);
assert.match(stateUi, /showServicePay/);
assert.match(stateUi, /showNursePay/);
assert.match(stateUi, /visitRescheduleHref/);
assert.match(stateUi, /editRequestHref/);
assert.match(stateUi, /buildVisitBookingRoute/);
assert.match(stateUi, /payload\?\.message/);
assert.match(stateUi, /pay_\$\{paymentId\}/);
assert.match(stateUi, /لغو بازدید/);
assert.doesNotMatch(stateUi, /router\.push\("\/home"\)/);

const page = read("components/ReservationDetails.tsx");
assert.match(page, /pageBase=\{basePath\}/);

const offers = read("components/NurseOffersList.tsx");
assert.match(offers, /staff_id: offer\.staff_id \?\? offer\.id/);

const service = read("src/lib/server/reservationLifecycleService.ts");
assert.match(service, /CANCELABLE_RESERVATION_STATUSES/);
assert.match(service, /center_public_id/);
assert.match(service, /visit_contract_feedback/);
assert.match(service, /applyVisitContractFeedback/);

const n8n = read("scripts/add-n8n-reservation-lifecycle.mjs");
assert.match(n8n, /awaitingSupport/);
assert.match(n8n, /readyForDispatch/);
assert.match(n8n, /center_public_id/);

const patch = read("scripts/patch-n8n-reservation-lifecycle-cancel.mjs");
assert.match(patch, /res_life_cancel/);
assert.match(patch, /NEW_CANCEL_STATUSES/);

const queryPatch = read(
  "scripts/patch-n8n-reservation-lifecycle-query-replacements.mjs"
);
assert.match(queryPatch, /queryReplacement/);
assert.match(queryPatch, /res_life_cancel/);

const errorPatch = read(
  "scripts/patch-n8n-reservation-lifecycle-error-responses.mjs"
);
assert.match(errorPatch, /success: false/);
assert.match(errorPatch, /res_life_if_validate/);
assert.match(errorPatch, /responseCode/);

const addLife = read("scripts/add-n8n-reservation-lifecycle.mjs");
assert.match(addLife, /One leading/);
assert.match(addLife, /return fail\(/);
assert.doesNotMatch(
  addLife,
  /const life = expr => `=\{\{ \$\('res_life_validate'\)\.item\.json\.\$\{expr\} \}\}`/
);

console.log("Reservation details action tests passed.");
