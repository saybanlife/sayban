import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.SAYBAN_E2E_URL || "http://127.0.0.1:3100";
const browser = await chromium.launch({
  headless: true,
  channel: process.env.SAYBAN_E2E_BROWSER || "msedge"
});
const context = await browser.newContext({ viewport: { width: 320, height: 568 } });

await context.addCookies([
  {
    name: "token",
    value: "eyJhbGciOiJub25lIn0.eyJpZCI6MSwiZXhwIjo0MTAyNDQ0ODAwfQ.",
    url: baseUrl
  }
]);

const page = await context.newPage();
page.setDefaultTimeout(60000);
page.setDefaultNavigationTimeout(120000);
await page.addInitScript(() => {
  window.localStorage.setItem("sayban.tehranServicesNoticeSeen:1", "1");
});
const pageErrors = [];
page.on("pageerror", error => pageErrors.push(String(error)));
const reservations = [
  { id: 1, user_id: 1, status: "pending", service_name: "رزرو بازدید", service_code: "VISIT" },
  { id: 2, user_id: 1, status: "inProgress", service_name: "پرستار", service_location: "home" },
  { id: 3, user_id: 1, status: "completed", service_name: "رزرو بازدید", service_code: "VISIT" },
  { id: 4, user_id: 1, status: "canceled", service_name: "پرستار", service_location: "home" },
  { id: 5, user_id: 1, status: "paymentCompleted", lifecycle_stage: "contract_closed", service_location: "home" }
];

await page.route("**/webhook/**", async route => {
  const url = route.request().url();
  if (/\/Reservation(?:\?|$)/i.test(url)) {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: reservations }) });
    return;
  }
  if (/\/categories\/full(?:\?|$)/i.test(url)) {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: [], sliders: [] }) });
    return;
  }
  if (/\/getProfile(?:\?|$)/i.test(url)) {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: { name: "کاربر تست" } }) });
    return;
  }
  await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: [] }) });
});

try {
  await page.goto(`${baseUrl}/home/`, { waitUntil: "commit" });
  const requestsButton = page.locator('[role="listitem"][aria-label="درخواست‌ها"]');
  await requestsButton.waitFor({ state: "visible", timeout: 20000 }).catch(async () => {
    const diagnostics = await page.evaluate(() => ({
      readyState: document.readyState,
      text: document.body?.innerText?.slice(0, 180) || ""
    }));
    throw new Error(
      `Footer button unavailable at ${page.url()}; readyState=${diagnostics.readyState}; text=${diagnostics.text}; page errors: ${pageErrors.join(" | ") || "none"}`
    );
  });
  await requestsButton.click();
  await page.waitForURL(/\/booking\/?$/);

  const activeTab = page.getByRole("tab", { name: "فعال (۲)" });
  const completedTab = page.getByRole("tab", { name: "تمام‌شده (۳)" });
  await activeTab.waitFor({ state: "visible" });
  assert.equal(await activeTab.getAttribute("aria-selected"), "true");
  assert.equal(await page.locator('[data-booking-list="active"] > [role="listitem"]').count(), 2);

  await completedTab.click();
  assert.equal(await completedTab.getAttribute("aria-selected"), "true");
  assert.equal(await page.locator('[data-booking-list="completed"] > [role="listitem"]').count(), 3);
  assert.equal(new URL(page.url()).pathname, "/booking/");

  const createButton = page.getByRole("button", { name: "ثبت درخواست جدید" });
  assert.equal(
    await createButton.evaluate(element => getComputedStyle(element).position),
    "fixed"
  );
  await createButton.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText("چه کاری می‌خواهید ثبت کنید؟").waitFor({ state: "visible" });
  assert.equal(await dialog.getByRole("button").count(), 4);

  if (process.env.SAYBAN_E2E_SCREENSHOT) {
    await page.screenshot({ path: process.env.SAYBAN_E2E_SCREENSHOT });
  }

  await dialog.getByRole("button", { name: /درخواست مراقب یا پرستار/ }).click();
  await page.waitForURL(/\/home\/bookNurse\/?$/);
  await dialog.waitFor({ state: "hidden" });

  await page.goto(`${baseUrl}/booking/`, { waitUntil: "commit" });
  await page.getByRole("button", { name: "ثبت درخواست جدید" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /بازدید مراکز سالمندان/ }).click();
  await page.waitForURL(/\/categories\/?$/);

  await page.goto(`${baseUrl}/booking/`, { waitUntil: "commit" });
  await page.getByRole("button", { name: "ثبت درخواست جدید" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /ثبت یادآوری دارو/ }).click();
  await page.waitForURL(/\/reminder\/reminderSetting\/?$/);

  console.log("Booking Footer navigation browser smoke passed.");
} finally {
  await browser.close();
}
