/**
 * Create-center keeps نوع مرکز / زمان فعالیت؛ center-info modal hides them.
 *   PREVIEW_BASE=http://127.0.0.1:PORT node scripts/e2e-center-type-fields.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium } from "playwright";

const centerPage = fs.readFileSync("components/CenterPage.tsx", "utf8");
assert.match(centerPage, /hideTypeFields:\s*true/);
const main = fs.readFileSync(
  "components/plasmic/sayban/PlasmicMain.tsx",
  "utf8"
);
assert.doesNotMatch(main, /hideTypeFields/);

const base = process.env.PREVIEW_BASE || "http://127.0.0.1:3003";
const url = `${base}/dev/panel-ui-preview/?view=center-fields`;

const browser = await chromium.launch({ headless: true, channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });

const create = page.locator('[data-preview="create-center"]');
await create.getByRole("button", { name: "نوع مرکز" }).waitFor({
  timeout: 30000
});
assert.equal(
  await create.getByRole("button", { name: "زمان فعالیت مرکز" }).count(),
  1
);
const createCare = await create
  .getByRole("button", { name: "نوع مرکز" })
  .innerText();
assert.match(createCare, /پرستاری/);

const modal = page.locator('[data-preview="center-info-modal"]');
await modal.getByRole("heading", { name: "اطلاعات مرکز" }).waitFor();
assert.equal(await modal.getByRole("button", { name: "نوع مرکز" }).count(), 0);
assert.equal(
  await modal.getByRole("button", { name: "زمان فعالیت مرکز" }).count(),
  0
);

await browser.close();
console.log("e2e-center-type-fields: ok");
