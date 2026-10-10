import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import path from "node:path";

const API = "https://sayban.darkube.ir/webhook/";
const MOBILE = "09228951264";

function pma(sql) {
  const r = spawnSync(
    process.execPath,
    [".cursor/sayban-ops/pma-sql.js", sql],
    { encoding: "utf8", cwd: process.cwd(), maxBuffer: 1e7 }
  );
  const o = r.stdout.trim();
  return JSON.parse(o.slice(o.indexOf("{"), o.lastIndexOf("}") + 1));
}

function otp(text, mobile) {
  return String(text).match(new RegExp(`${mobile}\\s+(\\d{4})\\s+`))?.[1];
}

await fetch(new URL("users/auth", API), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ mobile: MOBILE })
});
await new Promise(r => setTimeout(r, 1200));
const codes = pma(
  `SELECT id, mobile, code FROM users__sms_codes WHERE mobile='${MOBILE}' ORDER BY id DESC LIMIT 1`
);
const code = otp(codes.text || "", MOBILE);
const val = await (
  await fetch(new URL("users/validate", API), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mobile: MOBILE, code })
  })
).json();
const token = val?.data?.token || val?.token;
const list = await (
  await fetch(new URL("user/task/list", API), {
    headers: { Authorization: `Bearer ${token}` }
  })
).json();
const { normalizeReminderList } = await import(
  pathToFileURL(path.join(process.cwd(), "src/lib/reminderTask.ts")).href
);
const rows = normalizeReminderList(list);
console.log(
  JSON.stringify(
    rows.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      schedule_type: r.schedule_type,
      status: r.status,
      active: r.active,
      dates: r.dates,
      times: r.times
    })),
    null,
    2
  )
);
