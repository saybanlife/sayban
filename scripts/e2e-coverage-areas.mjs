/**
 * Coverage-areas picker inside the overview modal.
 *   PREVIEW_BASE=http://127.0.0.1:PORT node scripts/e2e-coverage-areas.mjs
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const base = process.env.PREVIEW_BASE || "http://127.0.0.1:3002";
const url = `${base}/dev/center-modal-preview/`;

async function realClick(page, locator) {
  const el = locator.first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  if (!box) throw new Error("no bounding box");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

const browser = await chromium.launch({ headless: true, channel: "msedge" });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true
});

await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.evaluate(() => sessionStorage.removeItem("sayban-dev-response-hours"));
await page.reload({ waitUntil: "domcontentloaded" });
await page.getByRole("button", { name: "مناطق تحت پوشش" }).waitFor({
  state: "visible",
  timeout: 30000
});

await realClick(page, page.getByRole("button", { name: "مناطق تحت پوشش" }));
await page.getByRole("button", { name: "سراسر تهران" }).waitFor();
await realClick(page, page.getByRole("button", { name: "سراسر تهران" }));
await realClick(page, page.getByRole("button", { name: "منطقه ۱", exact: true }));
await realClick(page, page.getByRole("button", { name: "کرج", exact: true }));

const allPressed = await page
  .getByRole("button", { name: "سراسر تهران" })
  .getAttribute("aria-pressed");
const d1Pressed = await page
  .getByRole("button", { name: "منطقه ۱", exact: true })
  .getAttribute("aria-pressed");
const karajPressed = await page
  .getByRole("button", { name: "کرج", exact: true })
  .getAttribute("aria-pressed");
assert.equal(allPressed, "false", "district clears all-tehran");
assert.equal(d1Pressed, "true");
assert.equal(karajPressed, "true", "karaj stays independent");

await realClick(page, page.getByRole("button", { name: "سراسر تهران" }));
const allAgain = await page
  .getByRole("button", { name: "سراسر تهران" })
  .getAttribute("aria-pressed");
const d1After = await page
  .getByRole("button", { name: "منطقه ۱", exact: true })
  .getAttribute("aria-pressed");
const karajAfter = await page
  .getByRole("button", { name: "کرج", exact: true })
  .getAttribute("aria-pressed");
assert.equal(allAgain, "true");
assert.equal(d1After, "false", "all-tehran clears districts");
assert.equal(karajAfter, "true", "karaj kept with all-tehran");

await realClick(page, page.getByRole("button", { name: "تأیید" }));
const trigger = page.getByRole("button", { name: "مناطق تحت پوشش" });
const triggerText = (await trigger.innerText()).replace(/\s+/g, " ");
assert.match(triggerText, /سراسر تهران/);
assert.match(triggerText, /کرج/);
assert.doesNotMatch(triggerText, /منطقه/);
assert.doesNotMatch(triggerText, /\d+\s*مورد|انتخاب/);
const overflow = await trigger.locator("span").first().evaluate(el => ({
  overflow: getComputedStyle(el).textOverflow,
  whiteSpace: getComputedStyle(el).whiteSpace
}));
assert.equal(overflow.overflow, "ellipsis");
assert.equal(overflow.whiteSpace, "nowrap");

await realClick(page, page.locator("[data-preview-save]"));
await page.waitForFunction(
  () =>
    (document.querySelector("[data-preview-save-status]")?.textContent || "").includes(
      "all_tehran"
    ),
  { timeout: 15000 }
);
const shown = await page.locator("[data-preview-coverage]").innerText();
assert.match(shown, /سراسر تهران/);
assert.match(shown, /کرج/);

await realClick(page, page.locator("[data-preview-reload]"));
await page.waitForFunction(
  () =>
    (document.querySelector("[data-preview-coverage]")?.textContent || "").includes(
      "سراسر تهران"
    ),
  { timeout: 15000 }
);
const afterReload = await page
  .getByRole("button", { name: "مناطق تحت پوشش" })
  .innerText();
assert.match(afterReload, /سراسر تهران/);
assert.match(afterReload, /کرج/);

await realClick(page, page.getByRole("button", { name: "مناطق تحت پوشش" }));
for (const name of ["منطقه ۱", "منطقه ۲", "منطقه ۳", "منطقه ۴", "منطقه ۵", "منطقه ۶"]) {
  await realClick(page, page.getByRole("button", { name: name, exact: true }));
}
await realClick(page, page.getByRole("button", { name: "تأیید" }));
const clipped = await page
  .getByRole("button", { name: "مناطق تحت پوشش" })
  .locator("span")
  .first()
  .evaluate(el => ({
    text: el.textContent || "",
    ellipsis: getComputedStyle(el).textOverflow,
    clipped: el.scrollWidth > el.clientWidth + 1
  }));
assert.equal(clipped.ellipsis, "ellipsis");
assert.match(clipped.text, /منطقه/);
assert.equal(clipped.clipped, true, "long coverage names ellipsize");
assert.doesNotMatch(clipped.text, /\d+\s*مورد/);

await browser.close();
console.log("e2e-coverage-areas: ok");
