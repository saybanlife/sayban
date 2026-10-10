import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = process.env.SAYBAN_UI_BASE || "http://127.0.0.1:3001";

const browser = await chromium.launch({
  headless: true,
  channel: process.env.PLAYWRIGHT_CHANNEL || "msedge"
});
const page = await browser.newPage({ viewport: { width: 390, height: 600 } });

try {
  await page.goto(`${BASE}/`, {
    waitUntil: "domcontentloaded",
    timeout: 120000
  });
  const root = page.locator("[data-scroll-stage]").first();
  await root.waitFor({ state: "attached", timeout: 120000 });
  await page.waitForFunction(
    () =>
      document.querySelector("[data-scroll-stage]")?.getAttribute(
        "data-scroll-stage"
      ) === "0"
  );
  await page.evaluate(() => {
    document.body.style.minHeight = "1400px";
  });

  async function expectStage(y, expected) {
    await page.evaluate(scrollY => window.scrollTo(0, scrollY), y);
    await page.waitForFunction(
      value =>
        document.querySelector("[data-scroll-stage]")?.getAttribute(
          "data-scroll-stage"
        ) === String(value),
      expected
    );
    assert.equal(
      await root.getAttribute("data-scroll-stage"),
      String(expected)
    );
  }

  await expectStage(80, 1);
  const searchButton = page.getByRole("button", { name: "باز کردن جستجو" });
  await searchButton.click();
  assert.equal(await root.getAttribute("data-search-expanded"), "true");

  await expectStage(170, 2);
  await expectStage(280, 3);
  await expectStage(230, 3);
  await expectStage(215, 2);
  await expectStage(120, 1);
  await expectStage(40, 0);

  console.log("home scroll DOM stages passed: 0→1→2→3→2→1→0");
} finally {
  await browser.close();
}
