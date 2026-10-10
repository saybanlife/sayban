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

const visitBookingUrl = asModuleUrl(read("components/reservation/visitBooking.ts"));
const modelSource = read("components/reservation/reservationDetailsModel.ts").replace(
  '"./visitBooking"',
  JSON.stringify(visitBookingUrl)
);
const modelUrl = asModuleUrl(modelSource);
const visitPostVisitUrl = asModuleUrl(
  read("components/reservation/visitPostVisitModel.ts").replace(
    '"./reservationDetailsModel"',
    JSON.stringify(modelUrl)
  )
);

const visit = await import(visitPostVisitUrl);

const ended = {
  id: 1,
  status: "completed",
  service_code: "VISIT",
  center_name: "تواناگستر"
};

assert.equal(visit.isVisitReservationEnded(ended), true);
assert.equal(visit.visitNeedsPostVisitHomeStatus(ended), true);
assert.equal(visit.visitAwaitingContractAnswer(ended), true);

const steps = visit.buildVisitPostVisitSteps(ended);
assert.equal(steps.length, 5);
assert.equal(steps.filter(s => s.current).length, 1);
assert.equal(steps.find(s => s.current)?.key, "contract");

assert.match(
  visit.reservationReviewPath("home", 9, { signed: false }),
  /\/reservation-center-review\/9\?signed=0/
);

assert.match(read("components/home/HomeStatusCardNext.tsx"), /visit_contract_feedback/);
assert.match(read("components/reservation/ReservationCenterReviewPage.tsx"), /ثبت نظر/);
assert.match(
  read("src/lib/server/reservationCenterReviewService.ts"),
  /PUBLIC_ROUTES\.setComment/
);

console.log("visit post-visit tests passed");
