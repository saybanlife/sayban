/**
 * Real pointer E2E: response-hours TimeField (inline) inside panel Modal.
 * Covers open → pick start/end → display → save → reload.
 *
 *   PREVIEW_BASE=http://127.0.0.1:PORT node scripts/e2e-response-hours-modal.mjs
 */
import { chromium } from "playwright";

const base = process.env.PREVIEW_BASE || "http://127.0.0.1:3003";
const url = `${base}/dev/center-modal-preview/`;

function toFaDigits(s) {
  return String(s).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

async function realClick(page, locator) {
  const el = locator.first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  if (!box) throw new Error("no bounding box for click target");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function pickInlineTime(page, triggerId, hour, minute) {
  await realClick(page, page.locator(`#${triggerId}`));

  const sheet = page.locator('[data-time-picker-sheet="inline"]');
  await sheet.waitFor({ state: "visible", timeout: 10000 });

  // Parent modal must stay open (no nested-dialog swallow).
  const modalStillOpen = await page.evaluate(() =>
    (document.body?.innerText || "").includes("ویرایش اطلاعات کلی")
  );
  if (!modalStillOpen) {
    throw new Error("parent modal closed when inline picker opened");
  }

  // Prefer real mouse on options; fall back to force if scroll obscures.
  const hourOpt = sheet.locator(
    `[aria-label="ساعت"] [data-value="${hour}"]`
  );
  const minuteOpt = sheet.locator(
    `[aria-label="دقیقه"] [data-value="${minute}"]`
  );

  await hourOpt.scrollIntoViewIfNeeded();
  try {
    await realClick(page, hourOpt);
  } catch {
    await hourOpt.click({ force: true });
  }

  await minuteOpt.scrollIntoViewIfNeeded();
  try {
    await realClick(page, minuteOpt);
  } catch {
    await minuteOpt.click({ force: true });
  }

  await page.waitForFunction(
    ({ hour: h, minute: m }) => {
      const sheetEl = document.querySelector(
        '[data-time-picker-sheet="inline"]'
      );
      if (!sheetEl) return false;
      return Boolean(
        sheetEl.querySelector(
          `[aria-label="ساعت"] [data-value="${h}"][aria-selected="true"]`
        ) &&
          sheetEl.querySelector(
            `[aria-label="دقیقه"] [data-value="${m}"][aria-selected="true"]`
          )
      );
    },
    { hour, minute },
    { timeout: 5000 }
  );

  const confirm = sheet.locator("button", { hasText: "تأیید" });
  await realClick(page, confirm);

  await page.waitForSelector('[data-time-picker-sheet="inline"]', {
    state: "detached",
    timeout: 5000
  });

  const expectedFa = `${toFaDigits(String(hour).padStart(2, "0"))}:${toFaDigits(
    String(minute).padStart(2, "0")
  )}`;
  const expectedEn = `${String(hour).padStart(2, "0")}:${String(minute).padStart(
    2,
    "0"
  )}`;

  await page.waitForFunction(
    ({ id, expectedFa: fa, expectedEn: en }) => {
      const btn = document.querySelector(`#${id}`);
      const text = (btn?.textContent || "").replace(/\s/g, "");
      return text.includes(fa) || text.includes(en);
    },
    { id: triggerId, expectedFa, expectedEn },
    { timeout: 5000 }
  );

  return expectedEn;
}

const browser = await chromium.launch({
  headless: true,
  channel: process.env.PW_CHANNEL || "chrome"
});
const page = await browser.newPage();
page.setDefaultTimeout(90000);

try {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector("#preview-response-start", { timeout: 90000 });

  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal").forEach(n => n.remove());
    sessionStorage.removeItem("sayban-dev-response-hours");
  });

  const modalText = await page.evaluate(() => document.body?.innerText || "");
  if (!modalText.includes("ویرایش اطلاعات کلی")) {
    throw new Error(
      `overview modal heading missing. body=${modalText.slice(0, 400)}`
    );
  }

  // Inline mode: no nested Radix dialog for the picker.
  const startEn = await pickInlineTime(page, "preview-response-start", 14, 30);
  if (startEn !== "14:30") throw new Error(`unexpected start pick ${startEn}`);

  const previewStart = await page
    .locator("[data-preview-response-start]")
    .getAttribute("data-preview-response-start");
  if (previewStart !== "14:30") {
    throw new Error(`start state not saved: ${previewStart}`);
  }

  const endEn = await pickInlineTime(page, "preview-response-end", 18, 0);
  if (endEn !== "18:00") throw new Error(`unexpected end pick ${endEn}`);

  const previewEnd = await page
    .locator("[data-preview-response-end]")
    .getAttribute("data-preview-response-end");
  if (previewEnd !== "18:00") {
    throw new Error(`end state not saved: ${previewEnd}`);
  }

  // Save (payload roundtrip) + remount fields.
  await realClick(page, page.locator("[data-preview-save]"));
  await page.waitForFunction(
    () => {
      const status =
        document
          .querySelector("[data-preview-save-status]")
          ?.getAttribute("data-preview-save-status") || "";
      return status.startsWith("saved:") || status.startsWith("save-error:");
    },
    { timeout: 10000 }
  );
  const saveStatus = await page
    .locator("[data-preview-save-status]")
    .getAttribute("data-preview-save-status");
  if (!saveStatus?.startsWith("saved:")) {
    throw new Error(`save failed: ${saveStatus}`);
  }

  const afterSaveStart = await page
    .locator("[data-preview-response-start]")
    .getAttribute("data-preview-response-start");
  const afterSaveEnd = await page
    .locator("[data-preview-response-end]")
    .getAttribute("data-preview-response-end");
  if (afterSaveStart !== "14:30" || afterSaveEnd !== "18:00") {
    throw new Error(
      `after save mismatch: ${afterSaveStart}|${afterSaveEnd}`
    );
  }

  // Clear UI state then reload from sessionStorage (simulates reopen modal).
  await page.evaluate(() => {
    const status = document.querySelector("[data-preview-save-status]");
    // Trigger remount via reload button only — do not wipe storage.
  });
  await realClick(page, page.locator("[data-preview-reload]"));
  await page.waitForFunction(
    () =>
      (document
        .querySelector("[data-preview-save-status]")
        ?.getAttribute("data-preview-save-status") || "").startsWith(
        "reloaded:"
      ),
    { timeout: 5000 }
  );

  await page.waitForSelector("#preview-response-start", { timeout: 10000 });
  const reloadedStartText = await page
    .locator("#preview-response-start")
    .innerText();
  const reloadedEndText = await page
    .locator("#preview-response-end")
    .innerText();
  const compactStart = reloadedStartText.replace(/\s/g, "");
  const compactEnd = reloadedEndText.replace(/\s/g, "");
  if (!/۱۴:۳۰|14:30/.test(compactStart)) {
    throw new Error(`reload start display broken: ${reloadedStartText}`);
  }
  if (!/۱۸:۰۰|18:00/.test(compactEnd)) {
    throw new Error(`reload end display broken: ${reloadedEndText}`);
  }

  const stillOpen = await page.evaluate(() =>
    (document.body?.innerText || "").includes("ویرایش اطلاعات کلی")
  );
  if (!stillOpen) {
    throw new Error("parent modal closed after picking times");
  }

  // Inline picker must not open a nested dialog.
  const nestedDialogs = await page.evaluate(() => {
    const dialogs = [...document.querySelectorAll('[role="dialog"]')];
    return dialogs.filter(d =>
      (d.textContent || "").includes("انتخاب ساعت")
    ).length;
  });
  if (nestedDialogs !== 0) {
    throw new Error(`unexpected nested time dialogs: ${nestedDialogs}`);
  }

  console.log("ok response-hours modal picker (inline + save/reload)");
} finally {
  await browser.close();
}
