/**
 * Verify cron_dispatch processes multiple pending deliveries in one run.
 *
 *   node scripts/e2e-reminder-dispatch-batch.mjs
 */
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const MARK = `batch-${Date.now()}`;
const REMINDER_ID = 37;
const USER_ID = 104;

function pma(sql) {
  const r = spawnSync(
    process.execPath,
    [".cursor/sayban-ops/pma-sql.js", sql],
    { encoding: "utf8", cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }
  );
  if (r.error) throw r.error;
  const out = ((r.stdout || "") + (r.stderr || "")).trim();
  const start = out.indexOf("{");
  const end = out.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error(`pma parse fail (${r.status}): ${out.slice(0, 300)}`);
  }
  const j = JSON.parse(out.slice(start, end + 1));
  if (j.success === false) throw new Error(j.error || j.text || "pma failed");
  return String(j.text || "");
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function idFromDelete(text, table) {
  const re = new RegExp(
    `DELETE FROM ${table} WHERE[\\s\\S]*?id\`?\\s*=\\s*(\\d+)`,
    "i"
  );
  const m = String(text).match(re);
  return m ? Number(m[1]) : null;
}

console.log("== insert 2 oldest-queue due notification deliveries ==");
const verT = pma(
  `SELECT id, version, status FROM reminders WHERE id=${REMINDER_ID} LIMIT 1`
);
// Row shape in pma HTML for SELECT id,version,status: "37 4 active"
const version = Number(
  (verT.match(new RegExp(`${REMINDER_ID}\\s+(\\d+)\\s+active`)) || [])[1]
);
assert.ok(version > 0, `reminder version missing: ${verT.slice(-200)}`);
console.log({ REMINDER_ID, version });

const occIds = [];
const delIds = [];
for (let i = 0; i < 2; i++) {
  const title = `${MARK}-${i}`;
  // Ancient fire_at so claim ORDER BY fire_at picks these first (queue may be large)
  pma(
    `INSERT INTO reminder_occurrences
      (reminder_id, user_id, reminder_version, fire_at, kind, title, body, channels, status)
     VALUES
      (${REMINDER_ID}, ${USER_ID}, ${version},
       '2000-01-0${i + 1} 00:00:00',
       'main', '${title}', 'batch body', '["notification"]', 'pending')`
  );
  const occT = pma(
    `SELECT id, status, title FROM reminder_occurrences
     WHERE title='${title}' ORDER BY id DESC LIMIT 1`
  );
  const occId = idFromDelete(occT, "reminder_occurrences");
  assert.ok(occId, `occ ${i} missing: ${occT.slice(-180)}`);
  occIds.push(occId);
  pma(
    `INSERT INTO reminder_deliveries
      (occurrence_id, reminder_id, user_id, channel, status, unit_cost)
     VALUES (${occId}, ${REMINDER_ID}, ${USER_ID}, 'notification', 'pending', 0)`
  );
  const delT = pma(
    `SELECT id, status FROM reminder_deliveries
     WHERE occurrence_id=${occId} AND channel='notification' LIMIT 1`
  );
  const delId = idFromDelete(delT, "reminder_deliveries");
  assert.ok(delId, `del ${i} missing`);
  delIds.push(delId);
}
console.log({ MARK, occIds, delIds });

console.log("== wait dispatch ==");
let bothDone = false;
for (let i = 0; i < 10; i++) {
  await sleep(12000);
  const t = pma(
    `SELECT id, status, last_error_code FROM reminder_deliveries
     WHERE id IN (${delIds.join(",")}) ORDER BY id`
  );
  const statuses = [...t.matchAll(/\b(pending|sending|sent|skipped|claimed)\b/g)].map(
    m => m[1]
  );
  // Prefer reading via DELETE id lines + nearby status words
  const s0 = (t.match(new RegExp(`${delIds[0]}[\\s\\S]{0,80}?(pending|sending|sent|skipped)`)) || [])[1];
  const s1 = (t.match(new RegExp(`${delIds[1]}[\\s\\S]{0,80}?(pending|sending|sent|skipped)`)) || [])[1];
  console.log(`poll ${i + 1}`, { s0, s1, statuses: statuses.slice(0, 6) });
  if (
    s0 &&
    s1 &&
    ["sent", "skipped"].includes(s0) &&
    ["sent", "skipped"].includes(s1)
  ) {
    bothDone = true;
    break;
  }
}

assert.ok(bothDone, "both deliveries must settle in one dispatch window");

pma(`DELETE FROM reminder_deliveries WHERE id IN (${delIds.join(",")})`);
pma(`DELETE FROM reminder_occurrences WHERE id IN (${occIds.join(",")})`);

console.log("PASS e2e-reminder-dispatch-batch");
