/**
 * Smoke: Add Event step 3 channel cards redesign @ 390px.
 *   node scripts/smoke-reminder-channel-cards-ui.mjs
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
  totalLabel: "۳۲ عدد در ماه",
  results: [
    {
      costs: { notification: 0, sms: 16000, bale: 6400 },
      totalLabel: "۳۲ عدد در ماه",
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

// Static source checks
const cardTsx = fs.readFileSync(
  path.join(root, "components/ReminderChannelCard.tsx"),
  "utf8"
);
const cardCss = fs.readFileSync(
  path.join(root, "components/ReminderChannelCard.module.css"),
  "utf8"
);
const report2 = fs.readFileSync(path.join(root, "components/Report2.tsx"), "utf8");
assert.match(cardTsx, /ReminderChannelCard/);
assert.match(cardCss, /#fdf9e8/i);
assert.match(cardCss, /#eef6d6/i);
assert.match(cardCss, /68px/);
assert.match(cardCss, /#c8e6b0/i);
assert.match(report2, /buildChannelPriceHint/);
assert.match(report2, /data-reminder-channel-price-hint/);

async function waitHome(page) {
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(400);
    if (page.url().includes("/login")) throw new Error("login");
    if (await page.evaluate(() => document.body.innerText.includes("یادآوری")))
      return;
  }
  throw new Error("home not ready");
}

async function openToChannels(page) {
  await page.getByText("ثبت یادآوری جدید").first().click({ force: true });
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
  assert.ok(box, "category");
  await page.mouse.click(box.x, box.y);
  await page.waitForTimeout(3200);
  await page.locator("button").filter({ hasText: /^ادامه$/ }).first().click();
  await page.waitForTimeout(1500);
  // schedule → channels
  const add = page.getByText("افزودن").first();
  if (await add.count()) {
    await add.click().catch(() => {});
    await page.waitForTimeout(600);
    const confirm = page.locator("button").filter({ hasText: /^تایید$/ }).first();
    if (await confirm.count()) await confirm.click();
    await page.waitForTimeout(600);
  }
  await page.locator("button").filter({ hasText: /^ادامه$/ }).first().click();
  await page.waitForTimeout(3500);
  const step = await page.evaluate(() =>
    document
      .querySelector("[data-reminder-event-step]")
      ?.getAttribute("data-reminder-event-step")
  );
  assert.equal(step, "2");
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.route("**/report/insert**", route =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(reportPayload)
  })
);

await page.goto(`${base}/home/`, {
  waitUntil: "domcontentloaded",
  timeout: 180000
});
await waitHome(page);
const later = page.getByRole("button", { name: "بعداً شاید" });
if (await later.count()) await later.click().catch(() => {});
const remNav = page.getByRole("button", { name: "یادآوری" });
if (await remNav.count()) await remNav.click();
else await page.getByRole("listitem", { name: "یادآوری" }).click();
await page.waitForTimeout(2500);

await openToChannels(page);
await page.screenshot({
  path: path.join(outDir, "channel-cards-step3-390.png")
});

const before = await page.evaluate(() => {
  const cards = [
    ...document.querySelectorAll("[data-reminder-channel-card='1']")
  ];
  const hint = document.querySelector("[data-reminder-channel-price-hint='1']");
  const perCardPrice = (document.body.innerText.match(/قیمت برای/g) || [])
    .length;
  return {
    count: cards.length,
    hint: hint?.textContent?.trim() || "",
    perCardPrice,
    cards: cards.map(el => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        channel: el.getAttribute("data-channel"),
        selected: el.getAttribute("data-selected"),
        h: Math.round(r.height),
        bg: cs.backgroundColor,
        border: cs.borderTopColor,
        borderW: cs.borderTopWidth,
        hasAdd: (el.textContent || "").includes("افزودن"),
        hasTrash: !!el.querySelector('[aria-label^="حذف"]'),
        text: (el.textContent || "").replace(/\s+/g, " ").trim()
      };
    })
  };
});

assert.ok(before.count >= 3, `expected >=3 cards, got ${before.count}`);
assert.ok(before.hint.includes("قیمت برای"), `hint: ${before.hint}`);
assert.equal(before.perCardPrice, 1, "price hint once above list");
for (const c of before.cards) {
  assert.ok(c.h >= 64 && c.h <= 72, `card height ${c.h}`);
}

// Toggle first unselected card → selected
const addBtn = page
  .locator("[data-reminder-channel-card='1'][data-selected='0'] button")
  .filter({ hasText: /افزودن/ })
  .first();
await addBtn.click();
await page.waitForTimeout(400);
await page.screenshot({
  path: path.join(outDir, "channel-cards-step3-selected-390.png")
});

const after = await page.evaluate(() => {
  const selected = [
    ...document.querySelectorAll(
      "[data-reminder-channel-card='1'][data-selected='1']"
    )
  ];
  return selected.map(el => {
    const cs = getComputedStyle(el);
    return {
      channel: el.getAttribute("data-channel"),
      bg: cs.backgroundColor,
      border: cs.borderTopColor,
      hasTrash: !!el.querySelector('[aria-label^="حذف"]'),
      hasAdd: (el.textContent || "").includes("افزودن")
    };
  });
});

assert.ok(after.length >= 1, "at least one selected");
assert.ok(
  after.some(c => c.bg === "rgb(238, 246, 214)" || c.bg.includes("238")),
  `selected bg ${JSON.stringify(after)}`
);
assert.ok(after.every(c => c.hasTrash && !c.hasAdd), "selected shows trash");

await browser.close();
console.log("PASS smoke-reminder-channel-cards-ui", {
  hint: before.hint,
  cards: before.cards.map(c => c.channel),
  selected: after.map(c => c.channel)
});
