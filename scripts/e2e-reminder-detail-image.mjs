/**
 * Reminder list: image thumb, lightbox, detail page, detail→edit.
 * Also checks ReminderSetting hides «افزودن».
 *   node scripts/e2e-reminder-detail-image.mjs
 */
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = process.env.SAYBAN_UI_BASE || "http://127.0.0.1:3000";
const SAMPLE =
  "https://teh-3.s3.poshtiban.com/lioms3/2026-06/panel/liad/2026-06-06-b48be7d5-b980-46c1-8232-72fa509d5524.png";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function dismissOverlay(page) {
  await page.evaluate(() => {
    document.querySelector("nextjs-portal")?.remove();
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
await page.route("**/api.liom.app/upload/**", route =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ status: true, result: SAMPLE })
  })
);

// --- ReminderSetting: افزودن hidden ---
await page.goto(`${BASE}/dev/reminder-companion-preview/`, {
  waitUntil: "domcontentloaded",
  timeout: 180000
});
await page.waitForFunction(
  () => /یادآوری/.test(document.body?.innerText || ""),
  { timeout: 120000 }
);
await dismissOverlay(page);
const addVisible = await page.evaluate(() => {
  const btns = [...document.querySelectorAll("button")].filter(b =>
    /^افزودن\s*$/.test((b.textContent || "").replace(/\s+/g, " ").trim())
  );
  return btns.some(b => {
    const r = b.getBoundingClientRect();
    const cs = getComputedStyle(b);
    return (
      r.width > 0 &&
      r.height > 0 &&
      cs.display !== "none" &&
      cs.visibility !== "hidden"
    );
  });
});
assert(!addVisible, "افزودن should be hidden on ReminderSetting");
console.log("settings: افزودن hidden ok");

// --- Main Reminder: image + detail + lightbox + edit ---
await page.goto(`${BASE}/dev/reminder-main-preview/`, {
  waitUntil: "domcontentloaded",
  timeout: 180000
});
await page.waitForFunction(
  () => /قرص فشار خون|بدون تصویر/.test(document.body?.innerText || ""),
  { timeout: 120000 }
);
await page.waitForTimeout(2500);
await dismissOverlay(page);

await page.waitForFunction(
  () => document.querySelectorAll("img[data-reminder-list-image]").length > 0,
  { timeout: 20000 }
);
const thumbSrc = await page
  .locator("img[data-reminder-list-image]")
  .first()
  .getAttribute("src");
assert(/^https?:/i.test(thumbSrc || ""), `thumb src bad: ${thumbSrc}`);
console.log("list image thumb ok");

// Lightbox from thumb
await page.locator("img[data-reminder-list-image]").first().click({ force: true });
await page.waitForTimeout(500);
await dismissOverlay(page);
assert(
  (await page.locator("[data-reminder-lightbox]").count()) > 0,
  "lightbox missing"
);
await page.locator('[data-reminder-lightbox] button[aria-label="بستن"]').click();
await page.waitForTimeout(400);
assert(
  (await page.locator("[data-reminder-lightbox]").count()) === 0,
  "lightbox not closed"
);
console.log("lightbox ok");

// Open detail via row (not image) — click title area
await page.getByText("قرص فشار خون").first().click({ force: true });
await page.waitForTimeout(1000);
await dismissOverlay(page);
const detail = page.locator("[data-reminder-detail]");
await detail.waitFor({ state: "visible", timeout: 10000 });
const detailText = await detail.innerText();
assert(/جزئیات یادآوری/.test(detailText), "detail title");
assert(/قرص فشار خون/.test(detailText), "detail name");
assert(/همراه/.test(detailText), "detail companion");
assert(
  (await detail.locator("img").count()) > 0,
  "detail hero image missing"
);
console.log("detail with image ok");

// Detail is a real page (not an overlay under Menu2).
const pageMode = await page.evaluate(() => {
  const detailEl = document.querySelector("[data-reminder-detail]");
  if (!detailEl) return null;
  const cs = getComputedStyle(detailEl);
  return {
    position: cs.position,
    hasHeader: /جزئیات یادآوری/.test(detailEl.textContent || "")
  };
});
assert(pageMode?.hasHeader, "detail header missing");
assert(
  pageMode && pageMode.position !== "fixed",
  `detail should be a real page, not fixed overlay: ${JSON.stringify(pageMode)}`
);
console.log("detail page mode ok");

// Detail lightbox: Back closes photo only
await detail.getByRole("button", { name: "نمایش بزرگ تصویر" }).click();
await page.waitForTimeout(400);
await dismissOverlay(page);
assert(
  (await page.locator("[data-reminder-lightbox]").count()) > 0,
  "detail lightbox missing"
);
const cover = await page.evaluate(() => {
  const lb = document.querySelector("[data-reminder-lightbox]");
  const detailEl = document.querySelector("[data-reminder-detail]");
  if (!lb || !detailEl) return null;
  const lr = lb.getBoundingClientRect();
  return {
    lbBottom: Math.round(lr.bottom),
    vh: window.innerHeight,
    lbZ: Number(getComputedStyle(lb).zIndex) || 0,
    hasEditOverPhoto: [...detailEl.querySelectorAll("button")].some(b =>
      /ویرایش|بستن/.test(b.innerText || "")
    )
  };
});
assert(cover && cover.lbBottom >= cover.vh - 2, `lightbox not full height: ${JSON.stringify(cover)}`);
assert(cover && cover.lbZ >= 1000, `lightbox z-index too low: ${JSON.stringify(cover)}`);
assert(cover && !cover.hasEditOverPhoto, "edit/close must not render over lightbox");
await page.evaluate(() => history.back());
await page.waitForTimeout(400);
assert(
  (await page.locator("[data-reminder-lightbox]").count()) === 0,
  "Back should close lightbox"
);
assert(
  (await page.locator("[data-reminder-detail]").count()) > 0,
  "Back must keep detail page open"
);
console.log("detail lightbox Back ok");

// Wide web: detail stays in phone column
await page.setViewportSize({ width: 1280, height: 900 });
await page.waitForTimeout(200);
const wide = await page.evaluate(() => {
  const detailEl = document.querySelector("[data-reminder-detail]");
  if (!detailEl) return null;
  const body = detailEl.querySelector("[class*='body']") || detailEl;
  const r = body.getBoundingClientRect();
  return { w: Math.round(r.width), left: Math.round(r.left) };
});
assert(wide && wide.w <= 520, `detail not phone-column on web: ${JSON.stringify(wide)}`);
console.log("web phone column ok");
await page.setViewportSize({ width: 390, height: 844 });

// Detail → edit
await detail.getByRole("button", { name: "ویرایش" }).click({ force: true });
await page.waitForTimeout(2000);
await dismissOverlay(page);
const bodyEdit = await page.locator("body").innerText();
assert(/ویرایش رویداد|عنوان/.test(bodyEdit), "edit form from detail missing");
assert(
  (await page.locator("[data-reminder-detail]").count()) === 0,
  "detail should close on edit"
);
console.log("detail → edit ok");

// Close edit if open
await page.keyboard.press("Escape");
await page.waitForTimeout(600);
await dismissOverlay(page);

// No-image row still opens detail without hero
await page.goto(`${BASE}/dev/reminder-main-preview/`, {
  waitUntil: "domcontentloaded",
  timeout: 180000
});
await page.waitForFunction(
  () => /بدون تصویر/.test(document.body?.innerText || ""),
  { timeout: 120000 }
);
await page.waitForTimeout(2500);
await dismissOverlay(page);
await page.getByText("بدون تصویر").first().click({ force: true });
await page.waitForTimeout(1000);
await dismissOverlay(page);
const detail2 = page.locator("[data-reminder-detail]");
await detail2.waitFor({ state: "visible", timeout: 10000 });
const d2 = await detail2.innerText();
assert(/بدون تصویر/.test(d2), "no-image detail name");
// Hero is optional — no list thumb for this row; detail may have 0 imgs
console.log("detail without image ok");

await page.screenshot({
  path: path.join(__dirname, "fixtures", "reminder-detail-image.png"),
  fullPage: true
});

await browser.close();
console.log("e2e-reminder-detail-image ok");
