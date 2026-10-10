/**
 * Mobile UI smoke: Home → Reminder → add-event wizard (3 steps).
 *   node scripts/e2e-reminder-add-event-ui.mjs
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", ".playwright-mcp");
const base = process.env.SAYBAN_BASE_URL || "http://localhost:3000";

const reportPayload = {
  success: true,
  totalPerChannel: [
    {
      type: "notification",
      name: "نوتیفیکیشن/اپ",
      value: "notification",
      price: 0,
      priceLabel: "رایگان"
    },
    {
      type: "sms",
      name: "پیامک",
      value: "sms",
      price: 500,
      priceLabel: "۵۰۰ ریال"
    },
    {
      type: "bale",
      name: "بله",
      value: "bale",
      price: 200,
      priceLabel: "۲۰۰ ریال"
    }
  ],
  totalNotifications: 32,
  totalLabel: "۳۲ عدد در سال",
  results: [
    {
      costs: { notification: 0, sms: 16000, bale: 6400 },
      totalLabel: "۳۲ عدد در سال",
      channels: [
        {
          type: "notification",
          name: "نوتیفیکیشن/اپ",
          value: "notification",
          price: 0,
          priceLabel: "رایگان"
        },
        {
          type: "sms",
          name: "پیامک",
          value: "sms",
          price: 500,
          priceLabel: "۵۰۰ ریال"
        },
        {
          type: "bale",
          name: "بله",
          value: "bale",
          price: 200,
          priceLabel: "۲۰۰ ریال"
        }
      ]
    }
  ]
};

async function waitHome(page) {
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(400);
    if (page.url().includes("/login")) throw new Error("bounced to login");
    const ok = await page.evaluate(() =>
      document.body.innerText.includes("یادآوری")
    );
    if (ok) return;
  }
  throw new Error("home menu not ready");
}

async function openWizard(page) {
  await page.getByText("ثبت یادآوری جدید").first().click({ timeout: 8000 });
  await page.waitForTimeout(1200);
  const box = await page.evaluate(() => {
    const tile = [
      ...document.querySelectorAll(
        '[class*="PlasmicReminderCategory_freeBox__fnxV4"], [class*="section"]'
      )
    ].find(
      el =>
        (el.textContent || "").includes("زمان دارو") &&
        el.getBoundingClientRect().height > 40
    );
    if (!tile) return null;
    const r = tile.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  assert.ok(box, "category tile زمان دارو not found");
  await page.mouse.click(box.x, box.y);
  await page.waitForTimeout(3500);
  const step = await page.evaluate(() =>
    document
      .querySelector("[data-reminder-event-step]")
      ?.getAttribute("data-reminder-event-step")
  );
  assert.equal(step, "0", "expected wizard step 0");
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await page.route("**/report/insert**", route =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(reportPayload)
    })
  );

  await page.goto(`${base}/home/`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await waitHome(page);
  const later = page.getByRole("button", { name: "بعداً شاید" });
  if (await later.count()) await later.click().catch(() => {});
  const remNav = page.getByRole("button", { name: "یادآوری" });
  if (await remNav.count()) await remNav.click();
  else await page.getByRole("listitem", { name: "یادآوری" }).click();
  await page.waitForTimeout(3500);

  await openWizard(page);
  await page.screenshot({ path: path.join(outDir, "e2e-ae-s0.png") });

  const s0 = await page.evaluate(() => {
    const pageEl = document.querySelector('[class*="ReminderEventPage_page"]');
    const title = [...document.querySelectorAll("input")].find(i =>
      (i.placeholder || "").includes("عنوان")
    );
    const cont = [...document.querySelectorAll("button")].find(
      b => (b.innerText || "").trim() === "ادامه"
    );
    return {
      enterText: document.body.innerText.includes("Enter some text"),
      checkboxDisplay: (() => {
        const el = document.querySelector('[class*="PlasmicCheckbox2"]');
        return el ? getComputedStyle(el).display : "absent";
      })(),
      titleW: title ? Math.round(title.getBoundingClientRect().width) : 0,
      continueBg: cont ? getComputedStyle(cont).backgroundColor : null,
      pageW: pageEl ? Math.round(pageEl.getBoundingClientRect().width) : 0,
      overflowX: document.documentElement.scrollWidth > window.innerWidth + 2
    };
  });
  assert.equal(s0.enterText, false, "Plasmic stub text must be hidden");
  assert.equal(s0.checkboxDisplay, "none", "Checkbox2 stub must be hidden");
  assert.ok(s0.titleW > 280, "title field should be full width");
  assert.equal(s0.overflowX, false);

  await page.locator("button").filter({ hasText: /^ادامه$/ }).first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, "e2e-ae-s1.png") });
  const s1 = await page.evaluate(() => ({
    step: document
      .querySelector("[data-reminder-event-step]")
      ?.getAttribute("data-reminder-event-step"),
    text: document.body.innerText.replace(/\s+/g, " ").slice(0, 400)
  }));
  assert.equal(s1.step, "1");
  assert.ok(s1.text.includes("زمان یادآوری") || s1.text.includes("تاریخ"));

  // Ensure a date is set (opens sheet if missing); confirm if sheet appears.
  const addDate = page.getByText("افزودن").first();
  if (await addDate.count()) {
    await addDate.click().catch(() => {});
    await page.waitForTimeout(800);
  }
  const confirm = page.locator("button").filter({ hasText: /^تایید$/ }).first();
  if (await confirm.count()) {
    // Wizard ادامه must not overlap nested sheet تایید.
    const overlap = await page.evaluate(() => {
      const cont = [...document.querySelectorAll("button")].find(
        b => (b.innerText || "").trim() === "ادامه"
      );
      const conf = [...document.querySelectorAll("button")].find(
        b => (b.innerText || "").trim() === "تایید"
      );
      if (!cont || !conf) return { ok: true, reason: "missing" };
      const cs = getComputedStyle(cont);
      return {
        ok: cs.visibility === "hidden" || cs.pointerEvents === "none" || cs.opacity === "0",
        vis: cs.visibility,
        pe: cs.pointerEvents
      };
    });
    assert.ok(overlap.ok, `ادامه must hide while date sheet open: ${JSON.stringify(overlap)}`);
    await confirm.click();
    await page.waitForTimeout(800);
  }

  await page.locator("button").filter({ hasText: /^ادامه$/ }).first().click();
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(outDir, "e2e-ae-s2.png") });
  const s2 = await page.evaluate(() => {
    const pageEl = document.querySelector('[class*="ReminderEventPage_page"]');
    const save = [...(pageEl?.querySelectorAll("button") || [])].find(b =>
      /تایید|ذخیره/.test(b.innerText || "")
    );
    return {
      step: pageEl?.getAttribute("data-reminder-event-step"),
      enterText: document.body.innerText.includes("Enter some text"),
      saveBg: save ? getComputedStyle(save).backgroundColor : null,
      body: document.body.innerText.replace(/\s+/g, " ").slice(0, 700),
      hasQuestion: document.body.innerText.includes("از چه طریقی")
    };
  });
  assert.equal(s2.step, "2");
  assert.equal(s2.enterText, false);
  assert.ok(s2.hasQuestion);
  // brand green ~ rgb(111, 138, 58)
  assert.ok(
    s2.saveBg && /111,\s*138,\s*58|111, 138, 58/.test(s2.saveBg),
    `save button should be green, got ${s2.saveBg}`
  );

  console.log("PASS e2e-reminder-add-event-ui", { s0, s1Step: s1.step, s2 });
  await browser.close();
}

main().catch(err => {
  console.error("FAIL", err);
  process.exit(1);
});
