/**
 * Create-event form: reset on each open + hardware Back step handling.
 *   node scripts/e2e-reminder-event-reset-back.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.SAYBAN_UI_BASE || "http://127.0.0.1:3000";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function dismissOverlay(page) {
  await page.evaluate(() => {
    document.querySelector("nextjs-portal")?.remove();
  });
}

async function openCreate(page) {
  const addOk = await page.evaluate(() => {
    const hit = [...document.querySelectorAll("button")].find(
      b => (b.textContent || "").replace(/\s+/g, " ").trim() === "افزودن"
    );
    if (!hit) return false;
    hit.click();
    return true;
  });
  assert(addOk, "افزودن not found");
  await page.waitForTimeout(1000);
  await dismissOverlay(page);

  const picked = await page.evaluate(() => {
    const dlg = document.querySelector("[role=dialog]");
    if (!dlg) return false;
    const boxes = [
      ...(dlg.querySelectorAll(
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
    if (!hit) return false;
    hit.click();
    return true;
  });
  assert(picked, "category item not clickable");
  await page.waitForSelector("[data-reminder-event-page]", { timeout: 15000 });
  await dismissOverlay(page);
}

async function formStep(page) {
  return page.evaluate(() => {
    const root = document.querySelector("[data-reminder-event-page]");
    if (!root) return null;
    const attr = root.getAttribute("data-reminder-event-step");
    if (attr != null) return Number(attr);
    if (root.querySelector('[class*="svg__fiXy5"]')) return 1;
    return 0;
  });
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

await page.goto(`${BASE}/dev/reminder-companion-preview/`, {
  waitUntil: "domcontentloaded",
  timeout: 180000
});
await page.waitForFunction(
  () => /یادآوری|رویداد/.test(document.body?.innerText || ""),
  { timeout: 120000 }
);
await page.waitForTimeout(2500);
await dismissOverlay(page);

// --- Open create, fill title, go step 2 ---
await openCreate(page);
assert((await formStep(page)) === 0, "create should open on step 0");
assert(
  /رویداد جدید/.test(
    await page.locator("[data-reminder-event-page]").innerText()
  ),
  "create title"
);

const titleInput = page
  .locator(
    "[data-reminder-event-page] input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio])"
  )
  .first();
await titleInput.waitFor({ state: "visible", timeout: 10000 });
await titleInput.fill("تست ریست فرم");

const continueBtn = page
  .locator("[data-reminder-event-page] button")
  .filter({ hasText: /ادامه|بعدی/ });
assert((await continueBtn.count()) > 0, "ادامه button missing");
await continueBtn.first().click({ force: true });
await page.waitForTimeout(1000);

let step = await formStep(page);
if (step !== 1) {
  await page.evaluate(() => {
    const root = document.querySelector("[data-reminder-event-page]");
    const btns = [...(root?.querySelectorAll("button") || [])];
    btns.find(b => /ادامه|بعدی/.test(b.textContent || ""))?.click();
  });
  await page.waitForTimeout(1000);
  step = await formStep(page);
}
assert(step === 1, `expected step 1 after ادامه, got ${step}`);
console.log("reached step 1");

// Phone Back → stay on form, step 0
await page.goBack();
await page.waitForTimeout(800);
assert(
  (await page.locator("[data-reminder-event-page]").count()) > 0,
  "Back on step 1 must keep form open"
);
assert((await formStep(page)) === 0, "Back on step 1 must return to step 0");
console.log("back from step 1 ok");

// Phone Back on step 0 → leave form (back to Reminder list)
await page.goBack();
await page.waitForTimeout(800);
assert(
  (await page.locator("[data-reminder-event-page]").count()) === 0,
  "Back on step 0 must close form"
);
assert(
  /یادآوری/.test(await page.locator("body").innerText()),
  "Back on step 0 must return to Reminder list"
);
console.log("back from step 0 ok");

// --- Re-open: must be reset (no leftover title, step 0) ---
await openCreate(page);
assert((await formStep(page)) === 0, "reopen must start at step 0");
const reopened = await page.locator("[data-reminder-event-page]").innerText();
assert(/رویداد جدید/.test(reopened), "reopen create title");
const titleVal = await page.evaluate(() => {
  const input = document.querySelector(
    "[data-reminder-event-page] input:not([type=hidden]):not([type=file]):not([type=checkbox])"
  );
  return input ? String(input.value || "") : "";
});
assert(
  !/تست ریست فرم/.test(titleVal),
  `form not reset on reopen, title still: ${titleVal}`
);
console.log("reset on reopen ok");

await page.goBack();
await page.waitForTimeout(500);

await browser.close();
console.log("e2e-reminder-event-reset-back ok");
