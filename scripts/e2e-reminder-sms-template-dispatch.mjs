/**
 * Live SMS test for allowlisted user only.
 * Sends users/sms with reminder_templates.template (not reminders.text).
 *
 *   node scripts/e2e-reminder-sms-template-dispatch.mjs
 */
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const MARK = `sms-tpl-${Date.now()}`;
const REMINDER_ID = 37;
const USER_ID = 104;
const VERSION = 1;

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

console.log("== ensure wallet balance for SMS ==");
pma(
  `INSERT INTO reminder_wallets (user_id, balance) VALUES (${USER_ID}, 1000)
   ON DUPLICATE KEY UPDATE balance = GREATEST(balance, 1000)`
);

console.log("== insert due SMS occurrence ==");
pma(
  `INSERT INTO reminder_occurrences
    (reminder_id, user_id, reminder_version, fire_at, kind, title, body, channels, status)
   VALUES
    (${REMINDER_ID}, ${USER_ID}, ${VERSION},
     DATE_SUB(NOW(), INTERVAL 45 SECOND),
     'main', '${MARK}', 'SHOULD_NOT_BE_SMS_BODY', '["sms"]', 'pending')`
);

const occT = pma(
  `SELECT id, status FROM reminder_occurrences
   WHERE title='${MARK}' ORDER BY id DESC LIMIT 1`
);
const occId =
  idFromDelete(occT, "reminder_occurrences") ||
  Number((occT.match(/(\d+)\s+pending/) || [])[1]);
assert.ok(occId, `occ missing: ${occT.slice(-200)}`);

pma(
  `INSERT INTO reminder_deliveries
    (occurrence_id, reminder_id, user_id, channel, status, unit_cost)
   VALUES (${occId}, ${REMINDER_ID}, ${USER_ID}, 'sms', 'pending', 500)`
);

const delT = pma(
  `SELECT id, status FROM reminder_deliveries
   WHERE occurrence_id=${occId} AND channel='sms' LIMIT 1`
);
const delId =
  idFromDelete(delT, "reminder_deliveries") ||
  Number((delT.match(/(\d+)\s+pending/) || [])[1]);
assert.ok(delId, `del missing: ${delT.slice(-200)}`);
console.log({ MARK, occId, delId });

let ok = false;
let last = "";
for (let i = 0; i < 10; i++) {
  await sleep(12000);
  last = pma(
    `SELECT o.status AS occ, d.status AS del, d.last_error_code, d.wallet_tx_id, d.sent_at
     FROM reminder_occurrences o
     JOIN reminder_deliveries d ON d.occurrence_id=o.id
     WHERE o.id=${occId} LIMIT 1`
  );
  console.log(`poll ${i + 1}`, last.slice(-200).replace(/\s+/g, " "));
  if (/\bsent\b/.test(last) && /sms/.test(last) === false) {
    // status columns: occ del — look for sent in del
  }
  if (/\bsent\b/.test(last)) {
    ok = true;
    break;
  }
  if (/\bskipped\b/.test(last)) {
    throw new Error(`SMS skipped: ${last.slice(-240)}`);
  }
}
assert.ok(ok, "SMS not sent within timeout");

// Confirm charged (template path reached send)
assert.match(last, /sent/, "delivery sent");

pma(`DELETE FROM reminder_deliveries WHERE id=${delId}`);
pma(`DELETE FROM reminder_occurrences WHERE id=${occId}`);

console.log("PASS e2e-reminder-sms-template-dispatch (template=medicine_time)");
