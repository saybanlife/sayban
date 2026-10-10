/**
 * Verify reminder create/edit opens and shows companion + image.
 *   node scripts/e2e-reminder-event-page.mjs
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
      data: [
        {
          id: 34,
          name: "همراه تست یادآوری",
          relation_persian: "فرزند"
        }
      ]
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

await page.goto(`${BASE}/dev/reminder-companion-preview/`, {
  waitUntil: "domcontentloaded",
  timeout: 180000
});
await page.waitForTimeout(3500);
await page.evaluate(() => document.querySelector("nextjs-portal")?.remove());

// --- Edit path ---
await page.getByText("✎").first().click({ force: true });
await page.waitForTimeout(2000);
await page.evaluate(() => document.querySelector("nextjs-portal")?.remove());

const bodyEdit = await page.locator("body").innerText();
assert(/ویرایش رویداد/.test(bodyEdit), "edit sheet missing");
assert(/همراه/.test(bodyEdit), "companion missing on edit");
assert(/تصویر یادآوری/.test(bodyEdit), "image label missing on edit");

const extras = page.locator("[data-reminder-form-extras]");
await extras.first().waitFor({ state: "visible", timeout: 15000 });
const select = page.locator("#reminder-companion").first();
await select.selectOption("34");
assert((await select.inputValue()) === "34", "companion select");

await extras.locator('input[type="file"]').first().setInputFiles(FIXTURE);
await page.waitForFunction(
  () =>
    [...document.querySelectorAll("[data-reminder-form-extras] img")].some(img =>
      /^https?:/i.test(img.getAttribute("src") || "")
    ),
  { timeout: 25000 }
);
console.log("edit ok");

// Close via X / back if present
await page.keyboard.press("Escape");
await page.waitForTimeout(800);
await page.evaluate(() => document.querySelector("nextjs-portal")?.remove());

// --- Create path via افزودن → category → form ---
await page.evaluate(() => {
  const hit = [...document.querySelectorAll("button, [role='button']")].find(
    el => /^افزودن$/.test((el.textContent || "").replace(/\s+/g, " ").trim())
  );
  if (!hit) throw new Error("افزودن missing");
  hit.click();
});
await page.waitForTimeout(800);
await page.evaluate(() => document.querySelector("nextjs-portal")?.remove());
await page.evaluate(() => {
  const dlg = document.querySelector("[role=dialog]");
  const boxes = [
    ...(dlg?.querySelectorAll(
      "[class*=RadioGrop_freeBox], [class*=radioGrop], [class*=RadioGrop]"
    ) || [])
  ];
  const hit =
    boxes.find(
      el => (el.textContent || "").replace(/\s+/g, " ").trim() === "مصرف دارو"
    ) ||
    boxes.find(el =>
      /مصرف دارو|دارو/.test((el.textContent || "").replace(/\s+/g, " ").trim())
    );
  if (!hit) throw new Error("category item missing");
  hit.click();
});
await page.waitForSelector("[data-reminder-event-page]", { timeout: 15000 });
await page.evaluate(() => document.querySelector("nextjs-portal")?.remove());

const bodyCreate = await page.locator("body").innerText();
assert(
  /رویداد جدید|عنوان/.test(bodyCreate),
  "create sheet missing after افزودن"
);
assert(/همراه/.test(bodyCreate), "companion missing on create");
assert(/تصویر یادآوری/.test(bodyCreate), "image missing on create");

const extrasCreate = page.locator("[data-reminder-form-extras]");
assert((await extrasCreate.count()) > 0, "extras on create");
await page.locator("#reminder-companion").first().selectOption("34");
await extrasCreate.locator('input[type="file"]').first().setInputFiles(FIXTURE);
await page.waitForFunction(
  () =>
    [...document.querySelectorAll("[data-reminder-form-extras] img")].some(img =>
      /^https?:/i.test(img.getAttribute("src") || "")
    ),
  { timeout: 25000 }
);
console.log("create ok");

await page.screenshot({
  path: path.join(__dirname, "fixtures", "reminder-event-page.png"),
  fullPage: true
});

await browser.close();
console.log("e2e-reminder-event-page ok");
