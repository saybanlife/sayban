/**
 * Inspect live reminder list/category payloads for UI contract mismatches.
 *   node scripts/inspect-reminder-api-shape.mjs
 */
import { spawnSync } from "node:child_process";

const API = "https://sayban.darkube.ir/webhook/";
const MOBILE = "09228951264";

function pma(sql) {
  const r = spawnSync(
    process.execPath,
    [".cursor/sayban-ops/pma-sql.js", sql],
    { encoding: "utf8", cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }
  );
  return JSON.parse((r.stdout || "").trim());
}

function extractOtp(text, mobile) {
  return String(text).match(new RegExp(`${mobile}\\s+(\\d{4})\\s+`))?.[1] || null;
}

async function login() {
  await fetch(new URL("users/auth", API), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile: MOBILE })
  });
  await new Promise((r) => setTimeout(r, 1500));
  const codes = pma(
    `SELECT id, mobile, code FROM users__sms_codes WHERE mobile='${MOBILE}' ORDER BY id DESC LIMIT 1`
  );
  const otp = extractOtp(codes.text || "", MOBILE);
  const val = await (
    await fetch(new URL("users/validate", API), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: MOBILE, code: otp })
    })
  ).json();
  return val?.data?.token || val?.token;
}

const token = await login();
const h = { Authorization: `Bearer ${token}` };
const list = await (await fetch(new URL("user/task/list", API), { headers: h })).json();
const cats = await (await fetch(new URL("reminders/categories", API))).json();

const reminders = list.reminders || list.result || [];
console.log(
  JSON.stringify(
    {
      listKeys: Object.keys(list),
      count: reminders.length,
      statuses: reminders.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        active: r.active,
        schedule_type: r.schedule_type,
        type: r.type,
        times: r.times,
        weekdays: typeof r.weekdays,
        channels: r.channels,
        chanels: r.chanels,
        deleted_at: r.deleted_at
      })),
      sample: reminders[0] || null,
      catKeys: Object.keys(cats),
      category: cats.category,
      type: cats.type
    },
    null,
    2
  )
);
