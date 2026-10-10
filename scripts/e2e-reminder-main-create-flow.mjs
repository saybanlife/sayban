/**
 * Main Reminder page create path (FAB → category → ReminderEventPage).
 * Surface under `/reminder` (MainLiad → Reminder), not ReminderSetting alone.
 *   node scripts/e2e-reminder-main-create-flow.mjs
 */
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = process.env.SAYBAN_UI_BASE || "http://127.0.0.1:3001";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOT = path.join(__dirname, "fixtures", "reminder-main-create-flow.png");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function dismissOverlay(page) {
  await page.evaluate(() => {
    document.querySelector("nextjs-portal")?.remove();
    document.querySelector("#__next-build-watcher")?.remove();
  });
}

async function clickByText(page, re) {
  return page.evaluate(pattern => {
    const rx = new RegExp(pattern);
    const nodes = [
      ...document.querySelectorAll("button, [role='button'], a, div, span")
    ];
    const el = nodes.reverse().find(n => {
      const t = (n.textContent || "").replace(/\s+/g, " ").trim();
      if (!rx.test(t) || t.length > 40) return false;
      const r = n.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    if (!el) return null;
    const target = el.closest("button") || el;
    target.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, view: window })
    );
    return (target.textContent || "").trim().slice(0, 40);
  }, re.source || String(re));
}

/** Bottom FAB on main Reminder (opens category via dialogOpendialog3). */
async function clickAddFab(page) {
  return page.evaluate(() => {
    const named = document.querySelector('[data-plasmic-name="button6"]');
    if (named) {
      const btn = named.closest("button") || named;
      btn.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, view: window })
      );
      return "button6";
    }
    // Fallback: round control near bottom center
    const candidates = [...document.querySelectorAll("button, [role='button']")];
    const fab = candidates.find(el => {
      const r = el.getBoundingClientRect();
      if (r.width < 40 || r.width > 90 || r.height < 40 || r.height > 90) {
        return false;
      }
      if (r.top < window.innerHeight * 0.65) return false;
      const t = (el.textContent || "").replace(/\s+/g, " ").trim();
      return t.length < 8;
    });
    if (!fab) return null;
    fab.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, view: window })
    );
    return "fab-fallback";
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
      data: [{ id: 34, name: "همراه تست یادآوری", relation_persian: "فرزند" }]
    })
  })
);

await page.goto(`${BASE}/dev/reminder-main-preview/`, {
  waitUntil: "domcontentloaded",
  timeout: 180000
});
await page.waitForFunction(
  () => /یادآوری/.test(document.body?.innerText || ""),
  { timeout: 120000 }
);
await page.waitForTimeout(2000);
await dismissOverlay(page);

console.log(
  "list snippet:",
  (await page.locator("body").innerText()).slice(0, 200).replace(/\n/g, " | ")
);

const fab = await clickAddFab(page);
console.log("fab click:", fab);
assert(fab, "Add FAB not found on main Reminder page");
await page.waitForTimeout(1500);
await dismissOverlay(page);

let body = await page.locator("body").innerText();
console.log("after fab:", body.slice(0, 300).replace(/\n/g, " | "));

const catPick =
  (await clickByText(page, /مصرف دارو|دارو/)) ||
  (await clickByText(page, /تأیید|تایید|ادامه|انتخاب|نوع یادآوری/));
console.log("cat pick:", catPick);
assert(catPick, "category picker did not open after FAB");
await page.waitForTimeout(1000);
await dismissOverlay(page);

body = await page.locator("body").innerText();
if (!/رویداد جدید|عنوان/.test(body)) {
  const ok = await clickByText(page, /^تأیید$|^تایید$|^ادامه$/);
  console.log("cat ok:", ok);
  await page.waitForTimeout(1500);
  await dismissOverlay(page);
  body = await page.locator("body").innerText();
}

console.log("form snippet:", body.slice(0, 350).replace(/\n/g, " | "));
assert(
  /رویداد جدید|عنوان/.test(body),
  `ReminderEventPage missing on main Reminder. Got: ${body.slice(0, 280)}`
);

const eventPage = await page.locator("[data-reminder-event-page]").count();
assert(eventPage > 0, "data-reminder-event-page not in DOM");

await page.screenshot({ path: SHOT, fullPage: true });
console.log("e2e-reminder-main-create-flow ok", { shot: SHOT, eventPage });

await browser.close();
