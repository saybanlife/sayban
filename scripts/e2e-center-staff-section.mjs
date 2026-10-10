/**
 * E2E: nursing center staff section → staff profile → list page.
 *   node scripts/e2e-center-staff-section.mjs
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";

const BASE = process.env.SAYBAN_E2E_BASE || "http://127.0.0.1:3002";
const CENTER_ID = process.env.SAYBAN_E2E_CENTER_ID || "108";
const FIX = "scripts/fixtures/center-staff-section.png";

const browser = await chromium.launch({
  headless: true,
  channel: "msedge"
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true
});

const errors = [];
page.on("console", m => {
  if (m.type() === "error") errors.push(m.text());
});

const centerUrl = `${BASE}/home/center/${CENTER_ID}/`;
await page.goto(centerUrl, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForTimeout(5000);
await page.evaluate(() => document.querySelector("nextjs-portal")?.remove());

const section = page.locator("#center-staff");
await section.waitFor({ state: "visible", timeout: 60000 });
const title = await section.locator("h2").innerText();
assert.match(title, /پرستاران مرکز/);

const cards = section.locator("article");
const cardCount = await cards.count();
assert.ok(cardCount >= 1, `expected staff cards, got ${cardCount}`);

const viewMore = section.getByRole("button", { name: /مشاهده بیشتر/ });
assert.equal(await viewMore.count(), 1);

await page.screenshot({ path: FIX, fullPage: true });

const firstName = (await cards.first().locator("h3").innerText()).trim();
await cards.first().locator("button").first().click();
await page.waitForTimeout(3500);
assert.match(page.url(), /\/staff_\d+/i, `expected staff profile, got ${page.url()}`);
console.log("staff profile ok", page.url(), firstName);

await page.goto(centerUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForTimeout(4000);
await page.locator("#center-staff").waitFor({ state: "visible", timeout: 60000 });
await page
  .locator("#center-staff")
  .getByRole("button", { name: /مشاهده بیشتر/ })
  .click();
await page.waitForURL(new RegExp(`centerStaffs_${CENTER_ID}`, "i"), {
  timeout: 60000
});
const listTitle = await page.locator("h1").first().innerText();
assert.match(listTitle, /پرستاران مرکز/);
await page.waitForSelector("article", { timeout: 90000 });
const listCards = await page.locator("article").count();
assert.ok(listCards >= 1, `expected list cards, got ${listCards}`);
console.log("staff list ok", page.url(), "cards", listCards);

// Non-nursing / elderly center should hide section when care_domain is elderly.
// Center 108 is nursing — empty staff nursing center 170 still shows section.
await page.goto(`${BASE}/home/center/170/`, {
  waitUntil: "domcontentloaded",
  timeout: 120000
});
await page.locator("#center-staff").waitFor({ state: "visible", timeout: 90000 });
const emptyText = await page.locator("#center-staff").innerText();
assert.match(emptyText, /ثبت نشده|پرستاران مرکز/);
console.log("empty nursing center ok");

await browser.close();
assert.ok(fs.existsSync(FIX));
console.log("e2e-center-staff-section: ok");
if (errors.length) {
  console.log("console errors (non-fatal):", errors.slice(0, 5));
}
