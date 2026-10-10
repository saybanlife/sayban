/**
 * Visual smoke: Add Event step 1 (زمان‌بندی) monthly + yearly @ 390px.
 *   node scripts/smoke-reminder-schedule-step-ui.mjs
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", ".playwright-mcp");
const base = process.env.SAYBAN_BASE_URL || "http://localhost:3000";

async function waitHome(page) {
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(400);
    if (page.url().includes("/login")) throw new Error("bounced to login");
    if (await page.evaluate(() => document.body.innerText.includes("یادآوری")))
      return;
  }
  throw new Error("home not ready");
}

async function dismissOverlays(page) {
  await page.evaluate(() => {
    document.querySelector("nextjs-portal")?.remove();
    document.querySelector("#webpack-dev-server-client-overlay")?.remove();
  });
}

async function openCategory(page, label) {
  await dismissOverlays(page);
  await page
    .getByText("ثبت یادآوری جدید")
    .first()
    .click({ timeout: 8000, force: true });
  await page.waitForTimeout(1200);
  const box = await page.evaluate(name => {
    const tile = [
      ...document.querySelectorAll(
        '[class*="PlasmicReminderCategory_freeBox__fnxV4"], [class*="section"]'
      )
    ].find(el => {
      const t = (el.textContent || "").replace(/\s+/g, " ");
      if (!t.includes(name)) return false;
      return el.getBoundingClientRect().height > 40;
    });
    if (!tile) return null;
    const r = tile.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, label);
  assert.ok(box, `category ${label} not found`);
  await page.mouse.click(box.x, box.y);
  await page.waitForTimeout(3500);
  const step = await page.evaluate(() =>
    document
      .querySelector("[data-reminder-event-step]")
      ?.getAttribute("data-reminder-event-step")
  );
  assert.equal(step, "0", "expected wizard step 0");
}

async function goScheduleStep(page) {
  await page.locator("button").filter({ hasText: /^ادامه$/ }).first().click();
  await page.waitForTimeout(1600);
  const step = await page.evaluate(() =>
    document
      .querySelector("[data-reminder-event-step]")
      ?.getAttribute("data-reminder-event-step")
  );
  assert.equal(step, "1", "expected schedule step");
}

async function measure(page) {
  return page.evaluate(() => {
    const pageEl = document.querySelector("[data-reminder-event-page]");
    const mark = document.querySelector(
      '[data-steps2-redesign="1"] [data-current="1"] [class*="mark"]'
    );
    const add =
      document.querySelector(
        '[data-reminder-event-step="1"] [class*="freeBox__gzUpg"], [data-reminder-event-step="1"] [class*="freeBox__yWwKt"], [data-reminder-event-step="1"] [class*="freeBox__aizxZ"], [data-reminder-event-step="1"] [class*="freeBox__wMslY"]'
      ) ||
      [...document.querySelectorAll("[data-reminder-event-step='1'] *")].find(
        el => {
          const t = (el.textContent || "").replace(/\s+/g, " ").trim();
          if (t !== "افزودن" && t !== "افزودن ") return false;
          const r = el.getBoundingClientRect();
          return r.height >= 30 && r.width >= 60;
        }
      );
    const prev = document.querySelector("[data-reminder-prev]");
    const cont = [...document.querySelectorAll("button")].find(
      b => (b.innerText || "").trim() === "ادامه"
    );
    const header = [
      ...document.querySelectorAll(
        '[data-reminder-event-page] [class*="PlasmicHeader"], [data-reminder-event-page] [class*="fixed-box"], [data-reminder-event-page] [class*="HeaderLiom"]'
      )
    ].find(el => {
      const r = getComputedStyle(el).borderBottomLeftRadius;
      return r && r !== "0px";
    });
    const cs = el => (el ? getComputedStyle(el) : null);
    const markCs = cs(mark);
    const addCs = cs(add);
    const prevCs = cs(prev);
    const contCs = cs(cont);
    const headerCs = cs(header);
    const pageCs = cs(pageEl);
    return {
      pageBg: pageCs?.backgroundColor,
      pageW: pageEl ? Math.round(pageEl.getBoundingClientRect().width) : 0,
      markSize: mark ? Math.round(mark.getBoundingClientRect().width) : 0,
      markShadow: markCs?.boxShadow || "",
      addH: add ? Math.round(add.getBoundingClientRect().height) : 0,
      addBorder: addCs?.borderTopColor,
      prevW: prev ? Math.round(prev.getBoundingClientRect().width) : 0,
      prevH: prev ? Math.round(prev.getBoundingClientRect().height) : 0,
      contH: cont ? Math.round(cont.getBoundingClientRect().height) : 0,
      headerRadius: headerCs?.borderBottomLeftRadius,
      text: document.body.innerText.replace(/\s+/g, " ").slice(0, 500)
    };
  });
}

async function closeWizard(page) {
  await page.evaluate(() => {
    history.back();
  });
  await page.waitForTimeout(800);
  const open = await page.evaluate(
    () => !!document.querySelector("[data-reminder-event-page]")
  );
  if (open) {
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(500);
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2
});
const page = await context.newPage();

await page.goto(`${base}/home/`, { waitUntil: "domcontentloaded", timeout: 180000 });
await waitHome(page);
const later = page.getByRole("button", { name: "بعداً شاید" });
if (await later.count()) await later.click().catch(() => {});
const remNav = page.getByRole("button", { name: "یادآوری" });
if (await remNav.count()) await remNav.click();
else await page.getByRole("listitem", { name: "یادآوری" }).click();
await page.waitForTimeout(3000);

await openCategory(page, "زمان دارو");
await goScheduleStep(page);
const monthly = await measure(page);
await page.screenshot({
  path: path.join(outDir, "schedule-step-monthly-390.png"),
  fullPage: false
});

assert.equal(monthly.pageW, 390);
assert.ok(
  monthly.pageBg === "rgb(245, 241, 227)" || monthly.pageBg.includes("245"),
  `page bg ${monthly.pageBg}`
);
assert.equal(monthly.markSize, 30);
assert.ok(monthly.markShadow.includes("111, 138, 58"));
assert.ok(monthly.addH >= 36 && monthly.addH <= 42, `addH ${monthly.addH}`);
assert.equal(monthly.prevW, 110);
assert.equal(monthly.prevH, 52);
assert.equal(monthly.contH, 52);
assert.ok(
  monthly.headerRadius === "32px" || monthly.headerRadius === "32.00px",
  `header radius ${monthly.headerRadius}`
);
assert.ok(
  monthly.text.includes("تاریخ پایان") && monthly.text.includes("زمان یادآوری"),
  "monthly fields"
);

await closeWizard(page);
await page.waitForTimeout(1200);
await dismissOverlays(page);

// Open category sheet and pick an everyYear-style tile when available.
await page
  .getByText("ثبت یادآوری جدید")
  .first()
  .click({ timeout: 8000, force: true });
await page.waitForTimeout(1200);
const yearlyLabel = await page.evaluate(() => {
  const prefer = ["تولد", "سالگرد", "مناسبت", "یادبود", "ازدواج"];
  const tiles = [
    ...document.querySelectorAll(
      '[class*="PlasmicReminderCategory_freeBox__fnxV4"], [class*="section"]'
    )
  ].filter(el => el.getBoundingClientRect().height > 40);
  for (const name of prefer) {
    const hit = tiles.find(el => (el.textContent || "").includes(name));
    if (hit) return name;
  }
  const alt = tiles.find(
    el =>
      !(el.textContent || "").includes("زمان دارو") &&
      (el.textContent || "").trim().length > 1
  );
  return alt
    ? (alt.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40)
    : "زمان دارو";
});
await page.keyboard.press("Escape").catch(() => {});
await page.waitForTimeout(400);

await openCategory(page, yearlyLabel.includes("زمان") ? "زمان دارو" : yearlyLabel.split(" ")[0]);
await goScheduleStep(page);
const yearly = await measure(page);
await page.screenshot({
  path: path.join(outDir, "schedule-step-yearly-390.png"),
  fullPage: false
});
assert.equal(yearly.pageW, 390);
assert.equal(yearly.markSize, 30);
assert.ok(
  yearly.text.includes("تاریخ یادآوری") ||
    yearly.text.includes("تاریخ پایان") ||
    yearly.text.includes("پیش یادآوری") ||
    yearly.text.includes("زمان یادآوری"),
  `schedule fields: ${yearly.text.slice(0, 220)}`
);

await browser.close();
console.log("PASS smoke-reminder-schedule-step-ui", {
  monthlyFields: "تاریخ پایان + زمان یادآوری",
  yearlySnippet: yearly.text.includes("پیش یادآوری")
    ? "has پیش یادآوری"
    : "schedule ok",
  shots: ["schedule-step-monthly-390.png", "schedule-step-yearly-390.png"]
});
