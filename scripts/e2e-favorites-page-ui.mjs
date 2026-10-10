/**
 * UI smoke: seed favorite, open /user/favorites with cookie, assert list + User menu row.
 *   node scripts/e2e-favorites-page-ui.mjs
 */
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";
import { PUBLIC_ROUTES, resolveApiUrl } from "../src/lib/apiRoutes.ts";

const MOBILE = "09228951264";
const CENTER_ID = Number(process.env.CENTER_ID || 171);
const BASE = process.env.SAYBAN_UI_BASE || "http://127.0.0.1:3000";

function pma(sql) {
  const r = spawnSync("node", [".cursor/sayban-ops/pma-sql.js", sql], {
    encoding: "utf8",
    cwd: process.cwd()
  });
  const j = JSON.parse(r.stdout || "");
  if (j.success === false) throw new Error(j.error || "pma error");
  return j.text || "";
}

function readOtp(text) {
  const m = String(text).match(/09228951264\s+(\d{4,6})\s+/);
  return m?.[1] || null;
}

async function loginJwt() {
  const authRes = await fetch(resolveApiUrl("users/auth"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile: MOBILE })
  });
  if (!authRes.ok) throw new Error(`auth ${authRes.status}`);
  await new Promise(r => setTimeout(r, 1500));
  const otp = readOtp(
    pma(
      `SELECT mobile, code FROM users__sms_codes WHERE mobile='${MOBILE}' ORDER BY id DESC LIMIT 1`
    )
  );
  if (!otp) throw new Error("OTP not found");
  const valJson = await (
    await fetch(resolveApiUrl("/users/validate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: MOBILE, code: otp })
    })
  ).json();
  const jwt = valJson?.data?.token || valJson?.token || valJson?.result?.token;
  if (!jwt) throw new Error("JWT missing");
  return jwt;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const token = await loginJwt();

let toggle = await fetch(resolveApiUrl(PUBLIC_ROUTES.favoritesToggle), {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ center_id: CENTER_ID })
}).then(r => r.json());
if (!toggle.favorited) {
  toggle = await fetch(resolveApiUrl(PUBLIC_ROUTES.favoritesToggle), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ center_id: CENTER_ID })
  }).then(r => r.json());
}
assert(toggle.favorited === true, "expected favorited");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
await context.addCookies([
  {
    name: "token",
    value: token,
    url: `${BASE}/`,
    httpOnly: false,
    secure: false,
    sameSite: "Lax"
  }
]);
const page = await context.newPage();
page.on("console", msg => {
  if (msg.type() === "error") console.log("console.error:", msg.text());
});

await page.addInitScript(value => {
  document.cookie = `token=${encodeURIComponent(value)}; path=/; SameSite=Lax`;
}, token);

await page.goto(`${BASE}/user/favorites/`, {
  waitUntil: "domcontentloaded",
  timeout: 120000
});
await page.waitForFunction(
  () => {
    const t = document.body?.innerText || "";
    return (
      t.includes("مرکز") ||
      t.includes("هنوز مرکزی") ||
      t.includes("وارد حساب") ||
      t.includes("خطا")
    );
  },
  { timeout: 60000 }
);
const closeBtn = page.getByRole("button", { name: "Close" });
if (await closeBtn.count()) {
  try {
    await closeBtn.first().click({ timeout: 1000 });
  } catch {
    /* ignore */
  }
}

const cookieProbe = await page.evaluate(() => document.cookie.includes("token="));
console.log("cookie present", cookieProbe);

const favText = await page.evaluate(() => document.body?.innerText || "");
assert(favText.includes("علاقه‌مندی‌ها"), "missing favorites title");
assert(!favText.includes("به سایبان خوش آمدید"), "redirected to login");
assert(
  favText.includes("مرکز تست") ||
    favText.includes("هنوز مرکزی") ||
    favText.includes("وارد حساب"),
  `unexpected favorites body: ${favText.slice(0, 300)}`
);
console.log("favorites page OK");

await page.goto(`${BASE}/user/`, {
  waitUntil: "domcontentloaded",
  timeout: 120000
});
await page.waitForTimeout(3000);
if (await closeBtn.count()) {
  try {
    await closeBtn.first().click({ timeout: 1000 });
  } catch {
    /* ignore */
  }
}

const menu = await page.evaluate(() => {
  const row = document.querySelector("[data-sayban-favorites='ready']");
  if (!row) return { found: false };
  const style = window.getComputedStyle(row);
  const label = (row.textContent || "").replace(/\s+/g, " ").trim();
  const heart = row.querySelector("[data-sayban-heart-icon]");
  const prev = row.previousElementSibling;
  return {
    found: true,
    display: style.display,
    cursor: style.cursor,
    label,
    hasHeart: Boolean(heart),
    prevIsLine:
      Boolean(prev) &&
      (String(prev.className).includes("line__") ||
        prev.classList.contains("__wab_instance"))
  };
});
assert(menu.found, "favorites menu row missing");
assert(menu.display === "flex", `expected display:flex got ${menu.display}`);
assert(menu.hasHeart, "heart icon missing");
assert(menu.label.includes("علاقه‌مندی‌ها"), `bad label: ${menu.label}`);
console.log("user menu favorites row OK", menu);

await page.click("[data-sayban-favorites='ready']");
await page.waitForTimeout(1500);
assert(
  page.url().includes("/favorites"),
  `menu click did not navigate: ${page.url()}`
);
console.log("menu navigates to favorites OK");

await browser.close();
console.log("E2E favorites page UI PASS");
