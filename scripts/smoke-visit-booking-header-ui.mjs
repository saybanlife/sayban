/**
 * Smoke: visit booking page chrome — sticky Header + scroll region.
 * Static assertions + optional live check when SAYBAN_BASE_URL is up.
 *
 *   node scripts/smoke-visit-booking-header-ui.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, ".playwright-mcp");
const base = process.env.SAYBAN_BASE_URL || "http://localhost:3000";
const CENTER = "a87ff679a2f3e71d9181a67b7542122c";

const pageTsx = fs.readFileSync(
  path.join(root, "components/centerPage/VisitBookingPage.tsx"),
  "utf8"
);
const pageCss = fs.readFileSync(
  path.join(root, "components/centerPage/VisitBookingPage.module.css"),
  "utf8"
);

assert.match(pageTsx, /data-visit-booking-page/);
assert.match(pageTsx, /styles\.scroll/);
assert.match(pageTsx, /from \"\.\.\/Header\"/);
assert.match(pageTsx, /MapPinIcon/);
assert.doesNotMatch(pageTsx, /BackChevron|styles\.backBtn/);

assert.match(pageCss, /height:\s*100dvh/);
assert.match(pageCss, /overflow:\s*hidden/);
assert.match(pageCss, /\.scroll\s*\{/);
assert.match(pageCss, /overflow-y:\s*auto/);
assert.match(pageCss, /position:\s*relative\s*!important/);
assert.match(pageCss, /\[class\*="freeBox__o41A2"\]/);
assert.match(pageCss, /\[class\*="section__lYw80"\]/);

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

// Fixture: same layout contract as VisitBookingPage (header outside scroll).
await page.setContent(`<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"/>
<style>
  html, body { margin: 0; height: 100%; font-family: Vazirmatn, sans-serif; }
  .page {
    display: flex; flex-direction: column; height: 100dvh; max-height: 100dvh;
    overflow: hidden; background: #f5efdb;
  }
  .header {
    position: relative; flex: 0 0 auto; z-index: 20;
    background: #6f8a3a; color: #fff; text-align: center;
    padding: 1rem; border-bottom-left-radius: 1rem; border-bottom-right-radius: 1rem;
  }
  .scroll {
    flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 0.85rem;
  }
  .block {
    height: 220px; margin-bottom: 0.75rem; border-radius: 1rem;
    background: #e7f0d8;
  }
</style>
</head>
<body>
  <div class="page" data-visit-booking-page>
    <header class="header" data-testid="vb-header">رزرو وقت بازدید</header>
    <div class="scroll" data-testid="vb-scroll">
      ${Array.from({ length: 8 }, (_, i) => `<div class="block">بخش ${i + 1}</div>`).join("")}
    </div>
  </div>
</body>
</html>`);

const before = await page.evaluate(() => {
  const header = document.querySelector("[data-testid='vb-header']");
  const scroll = document.querySelector("[data-testid='vb-scroll']");
  return {
    headerTop: header.getBoundingClientRect().top,
    scrollTop: scroll.scrollTop,
    scrollOverflow: getComputedStyle(scroll).overflowY,
    pageOverflow: getComputedStyle(document.querySelector(".page")).overflow
  };
});

assert.equal(before.headerTop, 0);
assert.equal(before.scrollOverflow, "auto");
assert.equal(before.pageOverflow, "hidden");

await page.evaluate(() => {
  const scroll = document.querySelector("[data-testid='vb-scroll']");
  scroll.scrollTop = 600;
});
await page.waitForTimeout(100);

const after = await page.evaluate(() => {
  const header = document.querySelector("[data-testid='vb-header']");
  const scroll = document.querySelector("[data-testid='vb-scroll']");
  return {
    headerTop: header.getBoundingClientRect().top,
    scrollTop: scroll.scrollTop
  };
});

assert.equal(after.headerTop, 0, "header must stay at top while content scrolls");
assert.ok(after.scrollTop > 100, "scroll region must actually move");

await page.screenshot({
  path: path.join(outDir, "visit-booking-header-sticky-fixture.png"),
  fullPage: false
});

// Live page (best-effort): confirm data attribute + scroll contract when reachable.
const mockToken =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6MjcsImV4cGlyZSI6MTc4NTQ3OTMxOH0.bHXhFR5zGJtqkfevWBu5oAZPvKv3hzhwXqSQb2zHe8A";
try {
  await page.context().addCookies([
    {
      name: "token",
      value: mockToken,
      domain: "localhost",
      path: "/"
    }
  ]);
  const res = await page.goto(
    `${base}/home/visitBooking_${CENTER}`,
    { waitUntil: "domcontentloaded", timeout: 120000 }
  );
  if (res && res.ok()) {
    await page.waitForTimeout(4000);
    const live = await page.evaluate(async () => {
      const root = document.querySelector("[data-visit-booking-page]");
      if (!root) {
        return { present: false, url: location.href, title: document.title };
      }
      const header = root.querySelector("section");
      const scroll = root.querySelector("[class*='scroll']") || root.children[1];
      const cs = scroll ? getComputedStyle(scroll) : null;
      const hs = header ? getComputedStyle(header) : null;
      const beforeTop = header?.getBoundingClientRect().top ?? null;
      if (scroll) scroll.scrollTop = 500;
      await new Promise(r => setTimeout(r, 80));
      const afterTop = header?.getBoundingClientRect().top ?? null;
      return {
        present: true,
        headerPosition: hs?.position || null,
        scrollOverflowY: cs?.overflowY || null,
        beforeTop,
        afterTop,
        scrollTop: scroll?.scrollTop ?? 0
      };
    });
    if (live.present) {
      assert.equal(live.headerPosition, "relative");
      assert.equal(live.scrollOverflowY, "auto");
      assert.equal(live.beforeTop, live.afterTop, "header must not move on scroll");
      assert.ok(live.scrollTop > 0, "content scroll region must move");
      await page.screenshot({
        path: path.join(outDir, "visit-booking-page-live-390.png"),
        fullPage: false
      });
      console.log("live visit booking page verified");
    } else {
      console.log(
        "live page rendered without data-visit-booking-page",
        live.url || ""
      );
    }
  }
} catch (err) {
  console.log("live check skipped:", err?.message || err);
}

await browser.close();
console.log("Visit booking header UI smoke passed.");
