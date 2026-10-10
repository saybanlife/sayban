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
const routesUrl = asModuleUrl(read("components/booking/bookingCreateRoutes.ts"));
const inactiveUrl = asModuleUrl(
  read("components/booking/inactiveBookingCardModel.ts")
    .replace(
      '"./bookingCreateRoutes"',
      JSON.stringify(routesUrl)
    )
    .replace(
      '"../reservation/reservationDetailsModel"',
      JSON.stringify(modelUrl)
    )
);
const tabsUrl = asModuleUrl(
  read("components/reservation/bookingTabs.ts").replace(
    '"./reservationDetailsModel"',
    JSON.stringify(modelUrl)
  )
);

const inactive = await import(inactiveUrl);
const tabs = await import(tabsUrl);

const completed = inactive.buildInactiveBookingCard({
  id: 1,
  status: "completed",
  service_name: "پانسمان",
  user: { name: "مادربزرگ فاطمه" },
  end_time: "2025-09-11T10:00:00Z",
  user_rating: 5
});
assert.equal(completed.badge.label, "تمام شد");
assert.equal(completed.badge.tone, "completed");
assert.match(completed.contextLabel, /پانسمان/);
assert.match(completed.title, /خدمت انجام شد/);
assert.match(completed.subtitle, /امتیاز شما/);
assert.deepEqual(
  completed.actions.map(a => a.kind),
  ["invoice", "repeat"]
);

const expired = inactive.buildInactiveBookingCard({
  id: 2,
  status: "rejected",
  service_location: "home",
  service_id: null,
  user: { name: "مادربزرگ فاطمه" }
});
assert.equal(expired.badge.label, "منقضی");
assert.equal(expired.badge.tone, "expired");
assert.match(expired.contextLabel, /\(قبلی\)/);
assert.equal(expired.title, "درخواست بدون پیشنهاد بسته شد");
assert.deepEqual(
  expired.actions.map(a => a.kind),
  ["repeat"]
);

const canceled = inactive.buildInactiveBookingCard({
  id: 3,
  status: "canceled",
  service_name: "تزریق",
  user: { name: "آقای رضایی" },
  updated_at: "2025-09-03T10:00:00Z",
  payment_status: "refunded"
});
assert.equal(canceled.badge.label, "لغو شده");
assert.equal(canceled.badge.tone, "canceled");
assert.match(canceled.title, /لغو شد/);
assert.match(canceled.subtitle, /بازگشت/);

const rows = tabs.reservationRows({
  result: [
    { id: 1, status: "pending" },
    { id: 2, status: "rejected" },
    { id: 3, status: "canceled" },
    { id: 4, status: "completed" }
  ]
});
assert.deepEqual(
  tabs.reservationsForBookingTab(rows, "completed").map(r => r.id),
  [2, 3, 4]
);

const booking = read("components/Booking.tsx");
assert.match(booking, /InactiveBookingCard/);
assert.match(booking, /selectedTab === "completed"/);
const patchSql = read(
  "scripts/patch-n8n-reservation-list-include-inactive.mjs"
);
assert.match(patchSql, /sayban-inactive-list-v1/);
assert.match(patchSql, /lifecycle_stage/);
assert.match(patchSql, /ELSE TRUE/);
assert.equal(
  /AND r\.status <> 'rejected'/.test(patchSql.split("NEW_QUERY")[1] || ""),
  false,
  "new list SQL must not exclude rejected"
);

console.log("Inactive booking cards tests passed.");
