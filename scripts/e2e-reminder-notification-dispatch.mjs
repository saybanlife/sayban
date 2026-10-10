/**
 * Live test: due reminder → n8n cron_dispatch → notification inbox.
 * Notification channel only.
 *
 *   node scripts/e2e-reminder-notification-dispatch.mjs
 */
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const MARK = `notif-live-${Date.now()}`;
const REMINDER_ID = 14;
const USER_ID = 30;
const VERSION = 3;

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

console.log("== insert due notification occurrence ==");
pma(
  `INSERT INTO reminder_occurrences
    (reminder_id, user_id, reminder_version, fire_at, kind, title, body, channels, status)
   VALUES
    (${REMINDER_ID}, ${USER_ID}, ${VERSION},
     DATE_SUB(NOW(), INTERVAL 45 SECOND),
     'main', '${MARK}', 'live notif test', '["notification"]', 'pending')`
);

const occT = pma(
  `SELECT id, status, title FROM reminder_occurrences
   WHERE title='${MARK}' ORDER BY id DESC LIMIT 1`
);
const occId =
  idFromDelete(occT, "reminder_occurrences") ||
  Number((occT.match(new RegExp(`(\\d+)\\s+pending\\s+${MARK}`)) || [])[1]);
assert.ok(occId, `occurrence id missing: ${occT.slice(-220)}`);

pma(
  `INSERT INTO reminder_deliveries
    (occurrence_id, reminder_id, user_id, channel, status, unit_cost)
   VALUES (${occId}, ${REMINDER_ID}, ${USER_ID}, 'notification', 'pending', 0)`
);

const delT = pma(
  `SELECT id, status FROM reminder_deliveries
   WHERE occurrence_id=${occId} AND channel='notification' LIMIT 1`
);
const delId =
  idFromDelete(delT, "reminder_deliveries") ||
  Number((delT.match(/(\d+)\s+pending/) || [])[1]);
assert.ok(delId, `delivery id missing: ${delT.slice(-220)}`);
console.log({ MARK, occId, delId });

console.log("== wait cron_dispatch ==");
let ok = false;
for (let i = 0; i < 8; i++) {
  await sleep(15000);
  const t = pma(
    `SELECT o.status AS occ, d.status AS del, d.inbox_notification_id, d.sent_at
     FROM reminder_occurrences o
     JOIN reminder_deliveries d ON d.occurrence_id=o.id
     WHERE o.id=${occId} LIMIT 1`
  );
  const settled = /\bsent\b/.test(t) || /\bskipped\b/.test(t);
  console.log(
    `poll ${i + 1}`,
    settled ? "settled" : "waiting",
    t.slice(-180).replace(/\s+/g, " ")
  );
  if (/\bsent\b/.test(t)) {
    ok = true;
    break;
  }
  if (/\bskipped\b/.test(t)) throw new Error(`skipped: ${t.slice(-220)}`);
}
assert.ok(ok, "not sent within ~2 minutes");

const inbox = pma(
  `SELECT id, title, notification_type FROM users__notification
   WHERE userId=${USER_ID} AND title='${MARK}' ORDER BY id DESC LIMIT 1`
);
console.log("inbox", inbox.slice(-200).replace(/\s+/g, " "));
assert.match(inbox, new RegExp(MARK), "inbox title");
assert.match(inbox, /reminder/, "notification_type");

pma(`DELETE FROM reminder_deliveries WHERE id=${delId}`);
pma(`DELETE FROM reminder_occurrences WHERE id=${occId}`);
pma(
  `DELETE FROM users__notification WHERE userId=${USER_ID} AND title='${MARK}'`
);

console.log("PASS e2e-reminder-notification-dispatch");
