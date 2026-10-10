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
const tabsUrl = asModuleUrl(
  read("components/reservation/bookingTabs.ts").replace(
    '"./reservationDetailsModel"',
    JSON.stringify(modelUrl)
  )
);
const tabs = await import(tabsUrl);
const createRoutes = await import(
  asModuleUrl(read("components/booking/bookingCreateRoutes.ts"))
);

const reservations = tabs.reservationRows({
  result: [
    { id: 1, status: "pending" },
    { id: 2, status: "inProgress" },
    { id: 3, status: "completed" },
    { id: 4, status: "canceled" },
    { id: 5, status: "paymentCompleted", lifecycle_stage: "contract_closed" }
  ]
});

assert.deepEqual(
  tabs.reservationsForBookingTab(reservations, "active").map(item => item.id),
  [1, 2]
);
assert.deepEqual(
  tabs.reservationsForBookingTab(reservations, "completed").map(item => item.id),
  [3, 4, 5]
);
assert.equal(tabs.countActiveBookings({ result: reservations }), 2);
assert.equal(tabs.countActiveBookings({ result: [] }), 0);
assert.equal(tabs.formatBookingBadgeCount(1), "۱");
assert.equal(tabs.formatBookingBadgeCount(0), "۰");
assert.equal(tabs.formatBookingBadgeCount(100), "۹۹+");
assert.deepEqual(tabs.reservationRows({ data: { result: reservations } }), reservations);
assert.deepEqual(
  tabs.reservationRows({ result: [{ status: "pending" }, ...reservations] }),
  reservations,
  "incomplete API rows must not affect tab counts"
);

const booking = read("components/Booking.tsx");
const homepage = read("components/Homepage.tsx");
const footerNav = read("src/fragment/footerShellNav.ts");
const apiRequest = read("src/fragment/components/api-request.tsx");
const menu2 = read("components/Menu2.tsx");
assert.match(booking, /role="tablist"/);
assert.match(booking, /فعال \(\{activeReservations\.length\.toLocaleString\("fa-IR"\)\}\)/);
assert.match(booking, /تمام‌شده \(\{completedReservations\.length\.toLocaleString\("fa-IR"\)\}\)/);
assert.match(booking, /RESERVATION_POLL_MS\s*=\s*30000/);
assert.match(booking, /reservationListSignature/);
assert.match(booking, /Soft remount of the SWR key only/);
assert.match(apiRequest, /hasSucceeded/);
assert.match(apiRequest, /keepPreviousData: !fresh \|\| refreshInterval > 0/);
assert.match(menu2, /activeKey !== "booking"/);
assert.match(menu2, /BOOKING_BADGE_POLL_MS = 60000/);
assert.match(homepage, /<DefaultBooking \{\.\.\.renderProps\} api \/>/);
assert.match(footerNav, /"booking"/);
assert.deepEqual(createRoutes.BOOKING_CREATE_ROUTES, {
  nurse: "/home/bookNurse/",
  centerVisit: `/home/${encodeURIComponent("Intake & Admissions")}/`,
  reminder: "/reminder/"
});
assert.match(
  createRoutes.BOOKING_CREATE_ROUTES.centerVisit,
  /Intake/
);
assert.match(
  read("components/booking/BookingCreateMenu.tsx"),
  /optionIconSand/
);

const createMenu = read("components/booking/BookingCreateMenu.tsx");
assert.match(createMenu, /aria-label="ثبت درخواست جدید"/);
assert.match(createMenu, /چه کاری می‌خواهید ثبت کنید؟/);
assert.match(createMenu, /setOpen\(false\);\s*void router\.push\(route\)/);

console.log("Booking navigation and tabs tests passed.");
