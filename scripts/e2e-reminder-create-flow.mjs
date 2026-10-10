/**
 * Full create path: افزودن → category → رویداد جدید + companion/image.
 * Also edit path. Uses hot-reload base (3001) by default.
 *   node scripts/e2e-reminder-create-flow.mjs
 */
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const BASE = process.env.SAYBAN_UI_BASE || "http://127.0.0.1:3001";
const SAMPLE =
  "https://teh-3.s3.poshtiban.com/lioms3/2026-06/panel/liad/2026-06-06-b48be7d5-b980-46c1-8232-72fa509d5524.png";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, "fixtures", "reminder-test.png");
const SHOT = path.join(__dirname, "fixtures", "reminder-create-flow.png");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

if (!fs.existsSync(FIXTURE)) {
  fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
  fs.writeFileSync(
    FIXTURE,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    )
  );
}

async function dismissOverlay(page) {
  await page.evaluate(() => {
    document.querySelector("nextjs-portal")?.remove();
    document.querySelector("#__next-build-watcher")?.remove();
  });
}

async function clickByText(page, re, { force = true } = {}) {
  const hit = await page.evaluate(pattern => {
    const rx = new RegExp(pattern);
    const nodes = [...document.querySelectorAll("button, [role='button'], a, div, span")];
    const el = nodes
      .reverse()
      .find(n => {
        const t = (n.textContent || "").replace(/\s+/g, " ").trim();
        if (!rx.test(t)) return false;
        // Prefer short labels (افزودن alone, not long paragraphs)
        if (t.length > 40) return false;
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
  return hit;
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
      data: [
        { id: 34, name: "همراه تست یادآوری", relation_persian: "فرزند" }
      ]
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

await page.goto(`${BASE}/dev/reminder-companion-preview/`, {
  waitUntil: "domcontentloaded",
  timeout: 180000
});
await page.waitForFunction(
  () => /یادآوری/.test(document.body?.innerText || ""),
  { timeout: 120000 }
);
await page.waitForTimeout(1500);
await dismissOverlay(page);

const body0 = await page.locator("body").innerText();
assert(/یادآوری/.test(body0), `list not loaded: ${body0.slice(0, 200)}`);
console.log("list ok");

// --- CREATE: افزودن ---
const addClick = await clickByText(page, /^افزودن$/);
console.log("add click:", addClick);
assert(addClick, "افزودن button not found");
await page.waitForTimeout(1500);
await dismissOverlay(page);

let bodyCat = await page.locator("body").innerText();
console.log("after add snippet:", bodyCat.slice(0, 300).replace(/\n/g, " | "));

// Category dialog should open — pick دارو / مصرف دارو / تأیید
const catPick =
  (await clickByText(page, /مصرف دارو|دارو/)) ||
  (await clickByText(page, /تأیید|تایید|ادامه|انتخاب/));
console.log("cat pick:", catPick);
await page.waitForTimeout(800);
await dismissOverlay(page);

// Try OK / تأیید in category if still on picker
bodyCat = await page.locator("body").innerText();
if (!/رویداد جدید|عنوان/.test(bodyCat)) {
  const ok =
    (await clickByText(page, /^تأیید$|^تایید$|^OK$|^ادامه$/)) ||
    (await clickByText(page, /تأیید|تایید/));
  console.log("cat ok:", ok);
  await page.waitForTimeout(1500);
  await dismissOverlay(page);
}

const bodyCreate = await page.locator("body").innerText();
console.log("create body:", bodyCreate.slice(0, 400).replace(/\n/g, " | "));
assert(
  /رویداد جدید|عنوان/.test(bodyCreate),
  `create form missing after category. Got: ${bodyCreate.slice(0, 280)}`
);
assert(/همراه/.test(bodyCreate), "companion field missing on create");
assert(/تصویر یادآوری/.test(bodyCreate), "image field missing on create");

const extras = page.locator("[data-reminder-form-extras]");
await extras.first().waitFor({ state: "visible", timeout: 15000 });
await page.locator("#reminder-companion").first().selectOption("34");
assert(
  (await page.locator("#reminder-companion").first().inputValue()) === "34",
  "companion select failed"
);
await extras.locator('input[type="file"]').first().setInputFiles(FIXTURE);
await page.waitForFunction(
  () =>
    [...document.querySelectorAll("[data-reminder-form-extras] img")].some(img =>
      /^https?:/i.test(img.getAttribute("src") || "")
    ),
  { timeout: 25000 }
);
console.log("create companion+image ok");

await page.screenshot({ path: SHOT, fullPage: true });

// Close create via back / dialog dismiss
await page.evaluate(() => {
  document.querySelector("nextjs-portal")?.remove();
  // Prefer explicit back control inside the event page
  const pageRoot = document.querySelector("[data-reminder-event-page]");
  const back = pageRoot
    ? [...pageRoot.querySelectorAll("button, [role='button'], a")].find(el => {
        const t = (el.textContent || "").replace(/\s+/g, " ").trim();
        return t === "" || /بازگشت|بستن/.test(t) || el.getAttribute("aria-label") === "بازگشت";
      })
    : null;
  if (back) {
    (back.closest("button") || back).click();
    return;
  }
  // Radix / Dialog close: set Escape
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
  );
});
await page.waitForTimeout(1000);
await dismissOverlay(page);

// If still on form, force-close by clicking list title area outside
for (let i = 0; i < 3; i++) {
  const still = /رویداد جدید|ویرایش رویداد/.test(
    await page.locator("body").innerText()
  );
  if (!still) break;
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  await dismissOverlay(page);
}

// Reload list for a clean edit path
await page.goto(`${BASE}/dev/reminder-companion-preview/`, {
  waitUntil: "domcontentloaded",
  timeout: 180000
});
await page.waitForTimeout(3500);
await dismissOverlay(page);

// --- EDIT ---
await page.getByText("✎").first().click({ force: true });
await page.waitForTimeout(2000);
await dismissOverlay(page);
const bodyEdit = await page.locator("body").innerText();
assert(/ویرایش رویداد|عنوان/.test(bodyEdit), "edit form missing");
assert(/همراه/.test(bodyEdit), "companion missing on edit");
await page.locator("#reminder-companion").first().selectOption("34");
await page
  .locator("[data-reminder-form-extras] input[type='file']")
  .first()
  .setInputFiles(FIXTURE);
await page.waitForFunction(
  () =>
    [...document.querySelectorAll("[data-reminder-form-extras] img")].some(img =>
      /^https?:/i.test(img.getAttribute("src") || "")
    ),
  { timeout: 25000 }
);
console.log("edit companion+image ok");

await browser.close();
console.log("e2e-reminder-create-flow ok");
