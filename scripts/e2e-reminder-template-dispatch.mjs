/**
 * Live test: template-based notification (title_fa/default_text)
 * + test allowlist (only mobile 09228951264).
 *
 *   node scripts/e2e-reminder-template-dispatch.mjs
 */
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const MARK = `tpl-dispatch-${Date.now()}`;
const REMINDER_ID = 37;
const USER_ID = 104; // mobile 09228951264
const OTHER_USER_ID = 30;
const VERSION = 1;
const EXPECT_TITLE = "مصرف دارو";
const EXPECT_TEXT_SNIPPET = "الان موقع خوردن دارو";

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

async function waitDelivery(occId, expectStatus) {
  for (let i = 0; i < 10; i++) {
    await sleep(12000);
    const t = pma(
      `SELECT o.status AS occ, d.status AS del, d.last_error_code, d.inbox_notification_id
       FROM reminder_occurrences o
       JOIN reminder_deliveries d ON d.occurrence_id=o.id
       WHERE o.id=${occId} LIMIT 1`
    );
    const settled = /\bsent\b/.test(t) || /\bskipped\b/.test(t);
    console.log(
      `poll ${i + 1}`,
      settled ? "settled" : "waiting",
      t.slice(-220).replace(/\s+/g, " ")
    );
    if (expectStatus === "sent" && /\bsent\b/.test(t)) return t;
    if (expectStatus === "skipped" && /\bskipped\b/.test(t)) return t;
  }
  throw new Error(`delivery not ${expectStatus} within timeout`);
}

console.log("== 1) allowlisted user notification ==");
pma(
  `INSERT INTO reminder_occurrences
    (reminder_id, user_id, reminder_version, fire_at, kind, title, body, channels, status)
   VALUES
    (${REMINDER_ID}, ${USER_ID}, ${VERSION},
     DATE_SUB(NOW(), INTERVAL 45 SECOND),
     'main', '${MARK}', 'SHOULD_NOT_USE_REMINDER_TEXT', '["notification"]', 'pending')`
);

const occT = pma(
  `SELECT id, status, title FROM reminder_occurrences
   WHERE title='${MARK}' AND user_id=${USER_ID} ORDER BY id DESC LIMIT 1`
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
console.log({ MARK, occId, delId, USER_ID });

await waitDelivery(occId, "sent");

const inbox = pma(
  `SELECT id, title, text, notification_type FROM users__notification
   WHERE userId=${USER_ID} AND title='${EXPECT_TITLE}'
     AND text LIKE '%${EXPECT_TEXT_SNIPPET}%'
   ORDER BY id DESC LIMIT 1`
);
console.log("inbox", inbox.slice(-260).replace(/\s+/g, " "));
assert.match(inbox, new RegExp(EXPECT_TITLE), "title_fa");
assert.match(inbox, new RegExp(EXPECT_TEXT_SNIPPET), "default_text");
assert.match(inbox, /reminder/, "notification_type");
assert.doesNotMatch(
  inbox,
  /SHOULD_NOT_USE_REMINDER_TEXT/,
  "must not use reminders.text"
);

const inboxId =
  idFromDelete(inbox, "users__notification") ||
  Number((inbox.match(/(\d+)\s+مصرف دارو/) || [])[1]);

pma(`DELETE FROM reminder_deliveries WHERE id=${delId}`);
pma(`DELETE FROM reminder_occurrences WHERE id=${occId}`);
if (inboxId) {
  pma(`DELETE FROM users__notification WHERE id=${inboxId}`);
}

console.log("== 2) non-allowlisted user must skip ==");
const MARK2 = `${MARK}-other`;
pma(
  `INSERT INTO reminder_occurrences
    (reminder_id, user_id, reminder_version, fire_at, kind, title, body, channels, status)
   VALUES
    (${REMINDER_ID}, ${OTHER_USER_ID}, ${VERSION},
     DATE_SUB(NOW(), INTERVAL 45 SECOND),
     'main', '${MARK2}', 'other user body', '["notification"]', 'pending')`
);
const occ2T = pma(
  `SELECT id, status FROM reminder_occurrences
   WHERE title='${MARK2}' ORDER BY id DESC LIMIT 1`
);
const occ2 =
  idFromDelete(occ2T, "reminder_occurrences") ||
  Number((occ2T.match(/(\d+)\s+pending/) || [])[1]);
assert.ok(occ2, "other occ missing");
pma(
  `INSERT INTO reminder_deliveries
    (occurrence_id, reminder_id, user_id, channel, status, unit_cost)
   VALUES (${occ2}, ${REMINDER_ID}, ${OTHER_USER_ID}, 'notification', 'pending', 0)`
);
const skipT = await waitDelivery(occ2, "skipped");
assert.match(skipT, /TEST_ALLOWLIST|تست/, "allowlist skip reason");

pma(`DELETE FROM reminder_deliveries WHERE occurrence_id=${occ2}`);
pma(`DELETE FROM reminder_occurrences WHERE id=${occ2}`);

console.log("PASS e2e-reminder-template-dispatch");
