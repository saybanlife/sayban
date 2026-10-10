import assert from "node:assert/strict";
import fs from "node:fs";

const read = relative =>
  fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");

const nav = await import(
  `data:text/javascript;base64,${Buffer.from(
    read("components/centerNavigation.ts")
  ).toString("base64")}`
).catch(async () => {
  const ts = await import("typescript");
  const source = read("components/centerNavigation.ts");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
  );
});

assert.equal(
  nav.buildVisitBookingRoute("home", "abc123"),
  "/home/visitBooking_abc123"
);
assert.equal(
  nav.extractVisitBookingIdFromSlug(["visitBooking_abc123"]),
  "abc123"
);
assert.equal(nav.extractVisitBookingIdFromSlug(["center"]), null);

const center = read("components/Center.tsx");
assert.match(center, /visitBookingMode/);
assert.match(center, /buildVisitBookingRoute/);
assert.match(center, /data-visit-booking-root/);
assert.match(center, /seedVisitService/);

const page = read("components/centerPage/VisitBookingPage.tsx");
assert.match(page, /from \"\.\.\/Header\"/);
assert.match(page, /<Header/);
assert.match(page, /slot=\"رزرو وقت بازدید\"/);
assert.match(page, /back=\{goBack\}/);
assert.match(page, /data-visit-booking-page/);
assert.match(page, /styles\.scroll/);
assert.match(page, /MapPinIcon/);
assert.doesNotMatch(page, /BackChevron|styles\.backBtn/);
assert.match(page, /startAddCompanion/);
assert.match(page, /rememberCompanionReturn/);
assert.match(page, /host: "visitBooking"/);
assert.match(page, /VisitBookingForm/);
assert.doesNotMatch(page, /import Center from/);
assert.doesNotMatch(page, /<Center/);

const form = read("components/centerPage/VisitBookingForm.tsx");
assert.match(form, /<Calendar/);
assert.match(form, /<Topics/);
assert.match(form, /<SelectTime/);
assert.match(form, /PUBLIC_ROUTES\.patients/);
assert.match(form, /buildReservationPayload/);
assert.match(form, /"POST", "\/reservations"/);
assert.match(form, /data-visit-booking-form/);
assert.match(form, /data-time-slot-viewport/);
assert.match(form, /findFirstAvailableBookingSlot/);
assert.match(form, /تا یک ماه آینده نوبت آزادی وجود ندارد/);
assert.match(form, /PUBLIC_ROUTES\.serviceWorkingRange/);
assert.match(form, /buildSlotRangeQueryParams/);
assert.match(form, /findFirstAvailableBookingDay/);
assert.match(form, /setSelectedDate\(found\.date\)/);
assert.doesNotMatch(form, /Promise\.all/);
assert.doesNotMatch(form, /candidates\.slice/);
assert.match(form, /DatePickerShimmer/);
assert.match(form, /TimePickerShimmer/);
assert.match(form, /CompanionShimmer/);
assert.match(form, /useState<BookingSlot>\(\{\}\)/);
assert.match(form, /hasId && hasName/);
assert.match(form, /useState<0 \| 1>\(0\)/);
assert.match(form, /disabled=\{monthOffset === 0\}/);
assert.match(form, /disabled=\{monthOffset === 1\}/);
assert.doesNotMatch(form, /changeMonth\(-1\)/);
assert.doesNotMatch(form, /patient\.name \|\| "همراه"/);
assert.doesNotMatch(form, /patient\.relation_persian \|\| "همراه شما"/);

const pageCss = read("components/centerPage/VisitBookingPage.module.css");
assert.match(pageCss, /\.scroll\s*\{/);
assert.match(pageCss, /overflow-y:\s*auto/);
assert.match(pageCss, /position:\s*relative\s*!important/);
assert.match(pageCss, /\.header\s*>\s*\*\s*\{[\s\S]*grid-column:\s*1\s*\/\s*-1\s*!important/);
assert.match(pageCss, /height:\s*100dvh/);
assert.match(pageCss, /--vb-beige:\s*#f5f1e3/);
assert.match(pageCss, /PlasmicCalendar_root/);
assert.match(pageCss, /PlasmicSelectTime_root/);
assert.match(pageCss, /PlasmicTimeShow_root/);
assert.match(pageCss, /\.timeViewport\s*\{[\s\S]*max-height:\s*9\.8rem/);
assert.match(pageCss, /\.confirmBar\s*\{[\s\S]*position:\s*fixed/);

const homepage = read("components/Homepage.tsx");
assert.match(homepage, /VisitBookingPage/);
assert.match(homepage, /extractVisitBookingIdFromSlug/);

const active = read("components/homepage/activeView.ts");
assert.match(active, /visitBooking_/);
assert.match(active, /"visitBooking"/);

const plasmic = read("components/plasmic/sayban/PlasmicCenter.tsx");
assert.match(plasmic, /onBookVisit/);
assert.match(plasmic, /seedVisitService/);
assert.match(plasmic, /\$props\.onBookVisit/);

console.log("Visit booking page tests passed.");
