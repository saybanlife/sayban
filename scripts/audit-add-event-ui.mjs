/**
 * Visual + layout audit for Add Event wizard vs mock.
 *   node scripts/audit-add-event-ui.mjs
 */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", ".playwright-mcp");
const base = process.env.SAYBAN_BASE_URL || "http://127.0.0.1:3000";
fs.mkdirSync(outDir, { recursive: true });

async function openWizard(page) {
  await page.getByText("ثبت یادآوری جدید").first().click({ timeout: 8000 });
  await page.waitForTimeout(1000);
  const box = await page.evaluate(() => {
    const tile = [
      ...document.querySelectorAll(
        '[class*="PlasmicReminderCategory_freeBox__fnxV4"], [class*="section"]'
      )
    ].find(
      el =>
        (el.textContent || "").includes("زمان دارو") &&
        el.getBoundingClientRect().height > 40
    );
    if (!tile) return null;
    const r = tile.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (!box) throw new Error("category tile missing");
  await page.mouse.click(box.x, box.y);
  await page.waitForTimeout(3000);
}

function layout(page) {
  return page.evaluate(() => {
    const root = document.querySelector("[data-reminder-event-page]");
    const step = root?.getAttribute("data-reminder-event-step");
    const prev = document.querySelector("[data-reminder-prev]");
    const cta = [...document.querySelectorAll("button")].find(b =>
      /^(ادامه|تایید و ذخیره)$/.test((b.innerText || "").trim())
    );
    const marks = [...document.querySelectorAll("[data-steps2-redesign] [data-current], [data-steps2-redesign] [class*='Steps2Redesign_mark'], [data-steps2-redesign] [class*='mark']")];
    const track = document.querySelector("[data-steps2-redesign]");
    const pr = prev?.getBoundingClientRect();
    const cr = cta?.getBoundingClientRect();
    const pcs = prev ? getComputedStyle(prev) : null;
    return {
      step,
      hasPrev: !!prev,
      prevParent: prev?.parentElement?.getAttribute("data-reminder-actions-row") || prev?.parentElement?.className?.toString?.().slice(0, 60),
      prev: pr
        ? {
            x: Math.round(pr.left),
            y: Math.round(pr.top),
            w: Math.round(pr.width),
            vis: pcs.visibility,
            display: pcs.display
          }
        : null,
      cta: cr
        ? { x: Math.round(cr.left), y: Math.round(cr.top), w: Math.round(cr.width), t: (cta.innerText || "").trim() }
        : null,
      sameRow:
        prev && cta
          ? Math.abs(pr.top - cr.top) < 12 && pr.left > cr.left - 5
          : null,
      stepperOk: !!track,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 2,
      title: document.body.innerText.includes("رویداد جدید"),
      enter: document.body.innerText.includes("Enter some text")
    };
  });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.route("**/report/insert**", route =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      success: true,
      totalPerChannel: { notification: 0, sms: 500, bale: 200 },
      totalNotifications: 32,
      totalLabel: "۳۲ عدد در سال",
      results: [
        {
          costs: { notification: 0, sms: 16000, bale: 6400 },
          channels: [
            {
              type: "notification",
              name: "نوتیفیکیشن/اپ",
              value: "notification",
              price: 0,
              priceLabel: "رایگان"
            },
            {
              type: "sms",
              name: "پیامک",
              value: "sms",
              price: 500,
              priceLabel: "۵۰۰ ریال"
            },
            {
              type: "bale",
              name: "بله",
              value: "bale",
              price: 200,
              priceLabel: "۲۰۰ ریال"
            }
          ]
        }
      ]
    })
  })
);

await page.goto(`${base}/home/`, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForTimeout(2000);
const later = page.getByRole("button", { name: "بعداً شاید" });
if (await later.count()) await later.click().catch(() => {});
const rem = page.getByRole("button", { name: "یادآوری" });
if (await rem.count()) await rem.click();
else await page.getByRole("listitem", { name: "یادآوری" }).click();
await page.waitForTimeout(3000);
await openWizard(page);
await page.screenshot({ path: path.join(outDir, "audit-s0.png") });
console.log("S0", await layout(page));

await page.locator("button").filter({ hasText: /^ادامه$/ }).first().click();
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(outDir, "audit-s1.png") });
console.log("S1", await layout(page));

const add = page.getByText("افزودن").first();
if (await add.count()) await add.click().catch(() => {});
await page.waitForTimeout(600);
const conf = page.locator("button").filter({ hasText: /^تایید$/ }).first();
if (await conf.count()) {
  await conf.click();
  await page.waitForTimeout(700);
}
await page.locator("button").filter({ hasText: /^ادامه$/ }).first().click();
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(outDir, "audit-s2.png") });
console.log("S2", await layout(page));

await browser.close();
