/**
 * Smoke-test Sayban reminders webhooks (no auth catalog + schema checks).
 *   node scripts/smoke-reminders.mjs
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const API = "https://sayban.darkube.ir/webhook/";

function pma(sql) {
  const res = spawnSync(
    process.execPath,
    [".cursor/sayban-ops/pma-sql.js", sql],
    { encoding: "utf8" }
  );
  const out = (res.stdout || "").trim();
  try {
    return JSON.parse(out.split(/\r?\n/).pop() || out);
  } catch {
    return { success: false, text: out.slice(0, 500) };
  }
}

async function get(path) {
  const res = await fetch(API + path);
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 300) };
  }
  return { status: res.status, json };
}

console.log("DB prices", pma("SELECT channel, unit_price, is_paid FROM reminder_channel_prices ORDER BY channel").text?.match(/notification[\s\S]*bale/) ? "ok-ish" : "check");
const prices = pma(
  "SELECT channel, unit_price, is_paid FROM reminder_channel_prices ORDER BY channel"
);
console.log(
  "prices success",
  prices.success,
  (prices.text || "").includes("500") && (prices.text || "").includes("200")
);

const cats = await get("reminders/categories");
console.log("categories", cats.status, cats.json?.success, Array.isArray(cats.json?.result) ? cats.json.result.length : cats.json);

const occ = await get("reminders/occasions");
console.log("occasions", occ.status, occ.json?.success, Array.isArray(occ.json?.result) ? occ.json.result.length : occ.json);

const sug = await get("reminders/suggestions");
console.log("suggestions", sug.status, sug.json?.success, Array.isArray(sug.json?.result) ? sug.json.result.length : sug.json);

const list = await get("reminders");
console.log("reminders without auth (expect fail/401)", list.status, list.json?.success ?? list.json?.message ?? list.json);

const tables = pma(
  "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'reminder%' ORDER BY TABLE_NAME"
);
console.log("tables ok", (tables.text || "").includes("reminders") && (tables.text || "").includes("reminder_wallets"));
