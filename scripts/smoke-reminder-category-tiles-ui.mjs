/**
 * Smoke: Reminder category picker tiles redesign @ 390px.
 *   node scripts/smoke-reminder-category-tiles-ui.mjs
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, ".playwright-mcp");
const base = process.env.SAYBAN_BASE_URL || "http://localhost:3000";

const css = fs.readFileSync(
  path.join(root, "components/ReminderCategory.module.css"),
  "utf8"
);
const tsx = fs.readFileSync(
  path.join(root, "components/ReminderCategory.tsx"),
  "utf8"
);
assert.match(css, /#fdf9e8/i);
assert.match(css, /#fbefc0/i);
assert.match(css, /scale\(0\.97\)/);
assert.match(css, /white-space:\s*nowrap/);
assert.match(tsx, /data-reminder-category-picker/);
assert.match(tsx, /data-reminder-type/);

async function waitHome(page) {
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(400);
    if (page.url().includes("/login")) throw new Error("login");
    if (await page.evaluate(() => document.body.innerText.includes("یادآوری")))
      return;
  }
  throw new Error("home not ready");
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

await page.goto(`${base}/reminder/`, {
  waitUntil: "domcontentloaded",
  timeout: 180000
});
await waitHome(page);
const later = page.getByRole("button", { name: "بعداً شاید" });
if (await later.count()) await later.click().catch(() => {});
await page.waitForTimeout(1200);

await page.getByText("ثبت یادآوری جدید").first().click({ force: true });
await page.waitForTimeout(2500);
await page.waitForSelector(
  "[data-reminder-category-picker='1'] [class*='freeBox__fnxV4'], [data-reminder-category-picker='1'] [data-reminder-type]",
  { timeout: 15000 }
);

await page.screenshot({
  path: path.join(outDir, "reminder-category-tiles-390.png")
});

const info = await page.evaluate(() => {
  const host = document.querySelector("[data-reminder-category-picker='1']");
  let tiles = [
    ...document.querySelectorAll(
      "[data-reminder-category-picker='1'] [data-reminder-type]"
    )
  ];
  if (tiles.length < 3) {
    tiles = [
      ...document.querySelectorAll(
        "[data-reminder-category-picker='1'] [class*='freeBox__fnxV4']"
      )
    ];
  }
  const cards = tiles.map(el => {
    const card =
      el.querySelector(
        '[class*="RadioGrop_rooticon"], [class*="rooticon"], [class*="radioGropicon"]'
      ) || el;
    const label = (el.textContent || "").replace(/\s+/g, " ").trim();
    const cs = getComputedStyle(card);
    const r = card.getBoundingClientRect();
    return {
      type: el.getAttribute("data-reminder-type"),
      label,
      w: Math.round(r.width),
      h: Math.round(r.height),
      bg: cs.backgroundColor,
      border: cs.borderTopColor,
      radius: cs.borderRadius,
      labelWs: (() => {
        const t = el.querySelector('[class*="text__kmQZi"]');
        return t ? getComputedStyle(t).whiteSpace : null;
      })(),
      labelFs: (() => {
        const t = el.querySelector('[class*="text__kmQZi"]');
        return t ? getComputedStyle(t).fontSize : null;
      })()
    };
  });
  const widths = cards.map(c => c.w);
  const maxW = Math.max(...widths, 0);
  const minW = Math.min(...widths.filter(Boolean), maxW || 0);
  return {
    host: !!host,
    count: cards.length,
    cards,
    widthSpread: maxW - minW,
    title: document.body.innerText.includes("نوع یادآوری")
  };
});

assert.ok(info.host, "picker host missing");
assert.ok(info.count >= 3, `expected >=3 tiles, got ${info.count}`);
assert.ok(info.title || info.cards.some(c => c.label), "sheet content");

const types = new Set(info.cards.map(c => c.type));
assert.ok(types.has("medicine_time") || info.cards.some(c => /دارو/.test(c.label)));
assert.ok(types.has("appointment") || info.cards.some(c => /نوبت/.test(c.label)));
assert.ok(types.has("occasion") || info.cards.some(c => /مناسبت/.test(c.label)));

for (const c of info.cards) {
  assert.ok(c.h >= 100, `tile height ${c.h}`);
  assert.ok(
    c.bg === "rgb(253, 249, 232)" || c.bg.includes("253"),
    `bg ${c.bg}`
  );
  assert.equal(c.labelWs, "nowrap", `label whiteSpace ${c.labelWs}`);
  assert.ok(
    c.labelFs === "12.75px" || c.labelFs === "13.5px",
    `label fontSize ${c.labelFs}`
  );
  assert.ok(
    !/\.\.\.|…/.test(c.label),
    `label truncated: ${c.label}`
  );
}
assert.ok(info.widthSpread <= 8, `unequal widths spread=${info.widthSpread}`);

// Click medicine tile still navigates (logic preserved)
const med = info.cards.find(
  c => c.type === "medicine_time" || /دارو/.test(c.label)
);
assert.ok(med);
await page.evaluate(() => {
  const el = document.querySelector(
    '[data-reminder-type="medicine_time"], [data-reminder-category-picker] [class*="freeBox__fnxV4"]'
  );
  const clickable =
    el?.querySelector('[class*="RadioGrop"], [class*="radioGrop"], button') ||
    el;
  clickable?.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true, view: window })
  );
});
await page.waitForTimeout(2500);
const opened = await page.evaluate(
  () => !!document.querySelector("[data-reminder-event-step]")
);
assert.ok(opened, "click must still open add-event wizard");

await browser.close();
console.log("PASS smoke-reminder-category-tiles-ui", {
  types: info.cards.map(c => c.type),
  widths: info.cards.map(c => c.w)
});
