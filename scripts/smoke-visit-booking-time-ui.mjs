import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";

const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browser = await chromium.launch({
  headless: true,
  ...(fs.existsSync(edge) ? { executablePath: edge } : {})
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const token =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MjcsImV4cCI6OTk5OTk5OTk5OX0.test";
await page.context().addCookies([
  { name: "token", value: token, domain: "localhost", path: "/" }
]);

let slotGroups = [];
let slotProvider = () => slotGroups;
let rangeProvider = () => [];
let rangeRequests = 0;
let responseDelayMs = 0;
let centerShape = "nested";
await page.route("**://sayban.darkube.ir/webhook/**", async route => {
  const url = new URL(route.request().url());
  const path = url.pathname;
  if (responseDelayMs) await new Promise(resolve => setTimeout(resolve, responseDelayMs));
  if (path.includes("/api/center")) {
    const center = { id: 4, name: "مرکز تست", city: "تهران" };
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(centerShape === "nested" ? { result: center } : center)
    });
  }
  if (path.includes("service/holiday")) {
    return route.fulfill({ status: 200, contentType: "application/json", body: '{"result":[]}' });
  }
  if (path.includes("service/working/range")) {
    rangeRequests += 1;
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ result: rangeProvider(url.searchParams) })
    });
  }
  if (path.includes("service/working")) {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ result: slotProvider(url.searchParams.get("date") || "") })
    });
  }
  if (path.includes("patients")) {
    return route.fulfill({ status: 200, contentType: "application/json", body: '{"data":[]}' });
  }
  return route.fulfill({ status: 200, contentType: "application/json", body: '{"success":true}' });
});

const makeSlot = (hour, status = "available") => ({
  slot_start: `${String(hour).padStart(2, "0")}:00`,
  slot_end: `${String(hour).padStart(2, "0")}:30`,
  status
});

async function openWith(groups) {
  slotGroups = groups;
  slotProvider = () => slotGroups;
  rangeProvider = () => [];
  await page.goto(
    "http://localhost:3000/home/visitBooking_a87ff679a2f3e71d9181a67b7542122c",
    { waitUntil: "domcontentloaded", timeout: 120000 }
  );
  await page.waitForSelector("[data-visit-booking-form]", { timeout: 120000 });
  await page.waitForTimeout(800);
}

responseDelayMs = 450;
const loadingNavigation = page.goto(
  "http://localhost:3000/home/visitBooking_a87ff679a2f3e71d9181a67b7542122c",
  { waitUntil: "domcontentloaded", timeout: 120000 }
);
await page.waitForSelector("[data-visit-booking-form]", { timeout: 120000 });
await Promise.all(
  [
    "در حال بارگذاری اطلاعات مرکز",
    "در حال بارگذاری تاریخ‌ها",
    "در حال دریافت ساعت‌ها",
    "در حال بارگذاری همراهان"
  ].map(label => page.getByLabel(label).waitFor())
);
await loadingNavigation;
responseDelayMs = 0;

await openWith([{ period: "morning", slots: Array.from({ length: 12 }, (_, i) => makeSlot(i + 7)) }]);
const viewport = page.locator("[data-time-slot-viewport]");
await viewport.waitFor();
const metrics = await viewport.evaluate(node => {
  const bounds = node.getBoundingClientRect();
  const options = Array.from(node.firstElementChild?.children ?? []);
  return {
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
    optionCount: options.length,
    fullyVisibleCount: options.filter(option => {
      const rect = option.getBoundingClientRect();
      return rect.top >= bounds.top && rect.bottom <= bounds.bottom;
    }).length
  };
});
assert.equal(metrics.optionCount, 12, "all slots must remain rendered");
assert.ok(metrics.fullyVisibleCount <= 9, "at most nine slots may be visible together");
assert.ok(metrics.scrollHeight > metrics.clientHeight, "more than nine slots must scroll");

await openWith([
  { period: "morning", slots: [] },
  { period: "noon", slots: [makeSlot(12), makeSlot(13)] }
]);
await page.getByRole("button", { name: "برو به اولین نوبت" }).click();
await page.waitForTimeout(150);
assert.ok(
  await page.getByText("12:00", { exact: true }).evaluate(node =>
    node.parentElement?.className.includes("rootselect")
  ),
  "first available action must select the earliest slot"
);

centerShape = "root";
let initialDate = "";
slotProvider = date => {
  if (!initialDate) {
    initialDate = date;
    return [{ period: "morning", slots: [] }];
  }
  return date > initialDate
    ? [{ period: "noon", slots: [makeSlot(12)] }]
    : [{ period: "morning", slots: [] }];
};
await page.goto(
  "http://localhost:3000/home/visitBooking_a87ff679a2f3e71d9181a67b7542122c",
  { waitUntil: "domcontentloaded", timeout: 120000 }
);
await page.waitForSelector("[data-visit-booking-form]", { timeout: 120000 });
await page.getByText("مرکز تست", { exact: true }).waitFor();
rangeRequests = 0;
rangeProvider = params => [{
  date: params.get("date_from"),
  result: [{ period: "noon", slots: [makeSlot(12)] }]
}];
await page.getByRole("button", { name: "برو به اولین نوبت" }).click();
await page.getByText("12:00", { exact: true }).waitFor();
assert.ok(
  await page.getByText("12:00", { exact: true }).evaluate(node =>
    node.parentElement?.className.includes("rootselect")
  ),
  "first available action must move to a later day and select its earliest slot"
);
assert.equal(rangeRequests, 1, "first available action must use one bulk request");

await openWith([{ period: "morning", slots: [] }]);
await page.getByRole("button", { name: "برو به اولین نوبت" }).click();
await page.getByText("تا یک ماه آینده نوبت آزادی وجود ندارد.", { exact: true }).waitFor();

await page.setViewportSize({ width: 1200, height: 900 });
const headerWidths = await page.locator("[data-visit-booking-page]").evaluate(root => {
  const header = root.firstElementChild;
  const surface = header?.firstElementChild;
  return {
    layout: root.getBoundingClientRect().width,
    header: header?.getBoundingClientRect().width ?? 0,
    surface: surface?.getBoundingClientRect().width ?? 0
  };
});
assert.ok(headerWidths.layout > 0, "mobile layout must have a measurable width on web");
assert.ok(
  Math.abs(headerWidths.header - headerWidths.layout) < 1 &&
    Math.abs(headerWidths.surface - headerWidths.layout) < 1,
  "header and its colored surface must match the mobile layout width on web"
);

await browser.close();
console.log("Visit booking time UI smoke passed.");
