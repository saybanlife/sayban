/**
 * E2E: panel/update/center working hours INSERT + UPDATE.
 *
 *   node scripts/e2e-panel-working-hours.mjs
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { resolveApiUrl, PANEL_ROUTES } from "../src/lib/apiRoutes.ts";

const CENTER_ID = Number(process.env.CENTER_ID || 171);
const DAYS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

function readEnv() {
  const envPath = path.join(
    process.cwd(),
    ".cursor/sayban-ops/secrets/n8n_sayban.env"
  );
  return Object.fromEntries(
    fs
      .readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .filter(line => line.trim() && !line.trim().startsWith("#"))
      .map(line => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      })
  );
}

function pma(sql) {
  const r = spawnSync("node", [".cursor/sayban-ops/pma-sql.js", sql], {
    encoding: "utf8",
    cwd: process.cwd()
  });
  const out = r.stdout || "";
  if (r.status !== 0 || out.includes('"success": false')) {
    throw new Error(out.slice(0, 800) || r.stderr);
  }
  return out;
}

function parseHours(text) {
  // Extract day rows from pma HTML-ish text dump
  const rows = [];
  const re =
    /DELETE FROM centers__working_hours WHERE `centers__working_hours`.`id` = (\d+)\s+(\d+)\s+(\w+)\s+(\d{2}:\d{2}:\d{2})\s+(\d{2}:\d{2}:\d{2})\s+(\d)/g;
  let m;
  while ((m = re.exec(text))) {
    rows.push({
      id: Number(m[1]),
      center_id: Number(m[2]),
      day_of_week: m[3],
      open_time: m[4],
      close_time: m[5],
      is_closed: Number(m[6])
    });
  }
  if (rows.length) return rows;
  // Fallback: empty set
  if (/zero rows|empty result/i.test(text)) return [];
  // Try simpler pattern from browse table without DELETE links
  const re2 =
    /(\d{2,})\s+(\d+)\s+(Sat|Sun|Mon|Tue|Wed|Thu|Fri)\s+(\d{2}:\d{2}:\d{2})\s+(\d{2}:\d{2}:\d{2})\s+(\d)/g;
  while ((m = re2.exec(text))) {
    rows.push({
      id: Number(m[1]),
      center_id: Number(m[2]),
      day_of_week: m[3],
      open_time: m[4],
      close_time: m[5],
      is_closed: Number(m[6])
    });
  }
  return rows;
}

function loadHours(centerId) {
  const text = pma(
    `SELECT id, center_id, day_of_week, open_time, close_time, is_closed FROM centers__working_hours WHERE center_id=${centerId} ORDER BY FIELD(day_of_week,'Sat','Sun','Mon','Tue','Wed','Thu','Fri'), id`
  );
  return parseHours(text);
}

async function postTimes(centerId, times) {
  const url = resolveApiUrl(PANEL_ROUTES.updateCenter);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ center_id: centerId, times })
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data, text };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const env = readEnv();
console.log("webhook", env.N8N_WEBHOOK_BASE || resolveApiUrl(PANEL_ROUTES.updateCenter));
console.log("center", CENTER_ID);

// Clean slate for this test center
pma(`DELETE FROM centers__working_hours WHERE center_id=${CENTER_ID}`);
assert(loadHours(CENTER_ID).length === 0, "cleanup failed");

// --- INSERT (no prior rows) ---
const insertTimes = DAYS.map((value, i) => ({
  value,
  start: `0${8 + (i % 2)}:00`.slice(-5),
  end: "17:00",
  isHoliday: value === "Fri"
}));
const ins = await postTimes(CENTER_ID, insertTimes);
console.log("INSERT response", ins.status, ins.data);
assert(ins.status === 200, `insert HTTP ${ins.status}`);
assert(ins.data?.success === true, `insert success flag: ${JSON.stringify(ins.data)}`);

await new Promise(r => setTimeout(r, 800));
let rows = loadHours(CENTER_ID);
console.log(
  "after insert",
  rows.map(r => `${r.day_of_week} ${r.open_time}-${r.close_time} closed=${r.is_closed}`)
);
assert(rows.length === 7, `expected 7 inserted days, got ${rows.length}`);
const sat = rows.find(r => r.day_of_week === "Sat");
assert(sat, "Sat missing after insert");
assert(sat.open_time.startsWith("08:00"), `Sat open expected 08:00 got ${sat.open_time}`);
const fri = rows.find(r => r.day_of_week === "Fri");
assert(fri?.is_closed === 1 || fri?.open_time === "00:00:00", "Fri should be closed");

const idsAfterInsert = Object.fromEntries(rows.map(r => [r.day_of_week, r.id]));

// --- UPDATE (prior rows exist) ---
const updateTimes = DAYS.map(value => ({
  value,
  start: "10:30",
  end: "18:45",
  isHoliday: false
}));
const upd = await postTimes(CENTER_ID, updateTimes);
console.log("UPDATE response", upd.status, upd.data);
assert(upd.status === 200, `update HTTP ${upd.status}`);
assert(upd.data?.success === true, `update success flag: ${JSON.stringify(upd.data)}`);

await new Promise(r => setTimeout(r, 800));
rows = loadHours(CENTER_ID);
console.log(
  "after update",
  rows.map(r => `${r.day_of_week} id=${r.id} ${r.open_time}-${r.close_time}`)
);
assert(rows.length === 7, `expected still 7 days after update, got ${rows.length}`);
for (const r of rows) {
  assert(r.open_time.startsWith("10:30"), `${r.day_of_week} open not updated: ${r.open_time}`);
  assert(r.close_time.startsWith("18:45"), `${r.day_of_week} close not updated: ${r.close_time}`);
  assert(
    r.id === idsAfterInsert[r.day_of_week],
    `${r.day_of_week} should UPDATE same row id ${idsAfterInsert[r.day_of_week]} got ${r.id}`
  );
}

// --- mixed: update existing + insert missing day ---
pma(
  `DELETE FROM centers__working_hours WHERE center_id=${CENTER_ID} AND day_of_week='Wed'`
);
assert(
  loadHours(CENTER_ID).length === 6,
  "precondition: Wed deleted"
);
const mixed = await postTimes(CENTER_ID, updateTimes);
console.log("MIXED response", mixed.status, mixed.data);
await new Promise(r => setTimeout(r, 800));
rows = loadHours(CENTER_ID);
assert(rows.length === 7, `mixed should restore Wed, got ${rows.length}`);
const wed = rows.find(r => r.day_of_week === "Wed");
assert(wed?.open_time.startsWith("10:30"), "Wed insert in mixed case failed");

console.log("E2E working-hours PASS (insert + update + mixed)");
