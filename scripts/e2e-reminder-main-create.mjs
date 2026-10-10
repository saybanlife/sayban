/**
 * Create flow from Reminder main (not ReminderSetting list).
 *   SAYBAN_UI_BASE=http://127.0.0.1:3000 node scripts/e2e-reminder-main-create.mjs
 */
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = process.env.SAYBAN_UI_BASE || "http://127.0.0.1:3000";
const SAMPLE =
  "https://teh-3.s3.poshtiban.com/lioms3/2026-06/panel/liad/2026-06-06-b48be7d5-b980-46c1-8232-72fa509d5524.png";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, "fixtures", "reminder-test.png");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

if (!fs.existsSync(FIXTURE)) {
  fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
  fs.writeFileSync(
    FIXTURE,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    )
  );
}

const browser = await chromium.launch({
  headless: true,
  channel: process.env.PLAYWRIGHT_CHANNEL || "msedge"
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true
});

await page.route("**/patients**", route =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      data: [{ id: 34, name: "همراه تست", relation_persian: "فرزند" }]
    })
  })
);
await page.route("**/api.liom.app/upload/**", route =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ status: true, result: SAMPLE })
  })
);

await page.goto(`${BASE}/dev/reminder-main-preview/`, {
  waitUntil: "domcontentloaded",
  timeout: 180000
});
await page.waitForFunction(
  () => /قرص فشار خون|یادآوری/.test(document.body?.innerText || ""),
  { timeout: 120000 }
);
await page.waitForTimeout(2000);
await page.evaluate(() => document.querySelector("nextjs-portal")?.remove());

// FAB + (button6) on Reminder main → category picker
await page.evaluate(() => {
  document.querySelector("nextjs-portal")?.remove();
  const fab = document.querySelector('[class*="button6"]');
  if (!fab) throw new Error("button6 FAB missing");
  fab.click();
});
await page.waitForTimeout(1500);
await page.evaluate(() => document.querySelector("nextjs-portal")?.remove());
let body = await page.locator("body").innerText();
assert(
  /نوع یادآوری|مصرف دارو|دارو/.test(body),
  `category missing: ${body.slice(0, 200)}`
);

await page.getByText("مصرف دارو").first().click({ force: true });
await page.waitForTimeout(1500);
await page.evaluate(() => document.querySelector("nextjs-portal")?.remove());
body = await page.locator("body").innerText();
assert(/رویداد جدید|عنوان/.test(body), "create form missing");
assert(/همراه/.test(body), "companion on create");
assert(/تصویر یادآوری/.test(body), "image on create");

const extras = page.locator("[data-reminder-form-extras]");
await extras.first().waitFor({ state: "visible", timeout: 15000 });
await page.locator("#reminder-companion").first().selectOption("34");
await extras.locator('input[type="file"]').first().setInputFiles(FIXTURE);
await page.waitForFunction(
  () =>
    [...document.querySelectorAll("[data-reminder-form-extras] img")].some(img =>
      /^https?:/i.test(img.getAttribute("src") || "")
    ),
  { timeout: 25000 }
);
console.log("main create companion+image ok");

await browser.close();
console.log("e2e-reminder-main-create ok");
