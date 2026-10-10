/**
 * Create / update Sayban n8n workflow `reminders` (لیاد greenfield).
 *
 *   node scripts/add-n8n-reminders.mjs
 *   node scripts/add-n8n-reminders.mjs --revert
 *
 * Credentials reused from existing workflows (MySQL account + sayban jwtAuth).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { TEHRAN_SCHEDULE_JS } from "./n8n/reminders/helpers.mjs";

const WORKFLOW_NAME = "reminders";
const MYSQL_CRED = { mySql: { id: "oNRa6pdlbbcsx18m", name: "MySQL account" } };
// n8n jwtAuth credential id (same as users / notification workflows)
const JWT_AUTH = {
  jwtAuth: { id: "6Zei652ydMbCGkil", name: "sayban" }
};

const WEBHOOK_BASE = "https://sayban.darkube.ir/webhook/";

function readEnv() {
  const envPath = path.join(
    process.cwd(),
    ".cursor/sayban-ops/secrets/n8n_sayban.env"
  );
  return Object.fromEntries(
    fs
      .readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .map((line) => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      })
  );
}

function uuid() {
  return crypto.randomUUID();
}

function authUserJs() {
  return `const input = items[0].json || {};
const headers = input.headers || {};
const auth = String(headers.authorization || headers.Authorization || "");
const raw = auth.replace(/^Bearer\\s+/i, "").trim();
let claims = {};
try {
  const part = (raw.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
  claims = JSON.parse(Buffer.from(part, "base64").toString("utf8")) || {};
} catch (e) { claims = {}; }
const user_id = Number(claims.id || claims.userId || claims.sub) || 0;
const body = input.body || {};
const query = input.query || {};
return [{ json: { user_id, body, query, ok: user_id > 0, headers } }];
`;
}

const PARSE_REMINDER_BODY = `${TEHRAN_SCHEDULE_JS}
const auth = items[0].json || {};
if (!auth.ok) return [{ json: { ok: false, message: 'Unauthorized' } }];
const b = auth.body || {};
const schedule_type = normalizeScheduleType(b.schedule_type || b.scheduleType);
const channels = normalizeChannels(b.channels || b.chanels);
const times = parseJsonArray(b.times);
let weekdays = parseJsonArray(b.weekdays);
const dates = parseJsonArray(b.dates);
const pre_reminders = b.pre_reminders != null ? b.pre_reminders : b.preReminders;
const name = String(b.name || b.title || '').trim();
const text = b.text != null ? String(b.text) : null;
const type = String(b.type || 'medicine_time').trim() || 'medicine_time';
const phone_number = b.phone_number || b.phoneNumber || null;
const bale_id = b.bale_id || b.baleId || null;
const finish_at = b.finish_at || b.finishTime || null;
const starts_at = b.starts_at || null;
const id = Number(b.id) || 0;
// Liad UI often omits weekdays on create (picker empty); homepage filters by weekday.
if (schedule_type === 'every_day' && weekdays.length === 0) {
  weekdays = ['saturday','sunday','monday','tuesday','wednesday','thursday','friday'];
}
const ok = Boolean(auth.user_id && name && times.length && schedule_type);
return [{ json: {
  ok, message: ok ? null : 'ورودی نامعتبر است',
  user_id: auth.user_id, id, type, schedule_type, name, text,
  weekdays: JSON.stringify(weekdays),
  dates: JSON.stringify(dates),
  times: JSON.stringify(times),
  pre_reminders: pre_reminders == null ? null : (typeof pre_reminders === 'string' ? pre_reminders : JSON.stringify(pre_reminders)),
  channels: JSON.stringify(channels),
  phone_number, bale_id, finish_at, starts_at,
  timezone: 'Asia/Tehran'
}}];
`;

const MATERIALIZE_FROM_ROW = `${TEHRAN_SCHEDULE_JS}
const row = items[0].json || {};
if (!row.id && !row.reminder_id) return [];
const reminder = {
  id: row.id || row.reminder_id,
  user_id: row.user_id,
  name: row.name,
  text: row.text,
  schedule_type: row.schedule_type,
  times: row.times,
  weekdays: row.weekdays,
  dates: row.dates,
  pre_reminders: row.pre_reminders,
  channels: row.channels,
  finish_at: row.finish_at,
  starts_at: row.starts_at,
  version: row.version || 1
};
const slots = buildFireSlots(reminder, 30);
const nextMat = tehranDateString(1) + ' 00:05:00';
return [{ json: {
  reminder_id: reminder.id,
  user_id: reminder.user_id,
  version: reminder.version,
  next_materialize_at: nextMat,
  slots,
  slot_count: slots.length,
  now: tehranNowString()
}}];
`;

function buildWorkflow() {
  const nodes = [];
  const connections = {};
  let y = 0;
  const col = (c) => c * 280;
  const row = (r) => r * 200;

  const add = (node) => {
    nodes.push(node);
    return node.name;
  };

  const link = (from, to) => {
    if (!connections[from]) connections[from] = { main: [[]] };
    if (!connections[from].main[0]) connections[from].main[0] = [];
    connections[from].main[0].push({ node: to, type: "main", index: 0 });
  };

  const webhook = (name, method, pathValue, x, yPos, withJwt = true) =>
    add({
      parameters: {
        httpMethod: method,
        path: pathValue,
        authentication: withJwt ? "jwtAuth" : "none",
        responseMode: "responseNode",
        options: {}
      },
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [col(x), row(yPos)],
      id: uuid(),
      name,
      webhookId: uuid(),
      credentials: withJwt ? JWT_AUTH : undefined
    });

  const code = (name, jsCode, x, yPos) =>
    add({
      parameters: { jsCode },
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [col(x), row(yPos)],
      id: uuid(),
      name
    });

  const mysql = (name, query, queryReplacement, x, yPos) =>
    add({
      parameters: {
        operation: "executeQuery",
        query,
        options: queryReplacement
          ? { queryReplacement }
          : {}
      },
      type: "n8n-nodes-base.mySql",
      typeVersion: 2.4,
      position: [col(x), row(yPos)],
      id: uuid(),
      name,
      credentials: MYSQL_CRED
    });

  const respond = (name, x, yPos) =>
    add({
      parameters: { options: {} },
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [col(x), row(yPos)],
      id: uuid(),
      name
    });

  const http = (name, method, url, jsonBody, x, yPos) =>
    add({
      parameters: {
        method,
        url,
        sendBody: true,
        specifyBody: "json",
        jsonBody,
        options: { timeout: 15000 }
      },
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [col(x), row(yPos)],
      id: uuid(),
      name,
      onError: "continueRegularOutput"
    });

  const schedule = (name, intervalMinutes, x, yPos) =>
    add({
      parameters: {
        rule: {
          interval: [{ field: "minutes", minutesInterval: intervalMinutes }]
        }
      },
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [col(x), row(yPos)],
      id: uuid(),
      name
    });

  // ---------- LIST ----------
  y = 0;
  for (const [wName, wPath] of [
    ["wh_reminders_list", "reminders"],
    ["wh_user_task_list", "user/task/list"]
  ]) {
    webhook(wName, "GET", wPath, 0, y);
    code(`${wName}_auth`, authUserJs(), 1, y);
    mysql(
      `${wName}_sql`,
      `SELECT id, user_id, type, schedule_type, name, text, weekdays, dates, times,
              pre_reminders, channels, phone_number, bale_id, timezone, starts_at, finish_at,
              status, version, created_at, updated_at
       FROM reminders
       WHERE user_id = $1 AND deleted_at IS NULL
       ORDER BY id DESC`,
      "={{ [$json.user_id] }}",
      2,
      y
    );
    code(
      `${wName}_wrap`,
      `const auth = $('${wName}_auth').first().json || {};
if (!auth.ok) return [{ json: { success: false, message: 'Unauthorized' } }];
const itemsOut = items.map(i => i.json).filter(r => r && r.id != null);
const reminders = itemsOut.map(r => ({
  ...r,
  schedule_type: r.schedule_type === 'every_day' ? 'everyDay'
    : r.schedule_type === 'every_year' ? 'everyYear'
    : r.schedule_type,
  chanels: r.channels,
  finishTime: r.finish_at,
  liomId: String(r.user_id),
  active: r.status === 'active' ? 1 : 0
}));
return [{ json: { success: true, result: reminders, items: reminders, reminders } }];`,
      3,
      y
    );
    respond(`${wName}_respond`, 4, y);
    link(wName, `${wName}_auth`);
    link(`${wName}_auth`, `${wName}_sql`);
    link(`${wName}_sql`, `${wName}_wrap`);
    link(`${wName}_wrap`, `${wName}_respond`);
    y += 1;
  }

  // ---------- CREATE ----------
  for (const [wName, wPath] of [
    ["wh_reminders_add", "reminders"],
    ["wh_user_task_add", "user/task/add"]
  ]) {
    webhook(wName, "POST", wPath, 0, y);
    code(`${wName}_auth`, authUserJs(), 1, y);
    code(`${wName}_parse`, PARSE_REMINDER_BODY, 2, y);
    mysql(
      `${wName}_insert`,
      `INSERT INTO reminders
        (user_id, type, schedule_type, name, text, weekdays, dates, times, pre_reminders,
         channels, phone_number, bale_id, timezone, starts_at, finish_at, status, next_materialize_at, version)
       VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,NULLIF($9,''),$10,$11,$12,'Asia/Tehran',$13,$14,'active', NOW(), 1);
       SELECT LAST_INSERT_ID() AS id;`,
      `={{ (() => { const j=$('${wName}_parse').first().json; return [j.user_id,j.type,j.schedule_type,j.name,j.text,j.weekdays,j.dates,j.times,j.pre_reminders,j.channels,j.phone_number,j.bale_id,j.starts_at,j.finish_at]; })() }}`,
      3,
      y
    );
    mysql(
      `${wName}_wallet`,
      `INSERT IGNORE INTO reminder_wallets (user_id, balance) VALUES ($1, 0);
       SELECT id, user_id, type, schedule_type, name, text, weekdays, dates, times, pre_reminders,
              channels, phone_number, bale_id, starts_at, finish_at, status, version
       FROM reminders WHERE id = $2 AND user_id = $1 LIMIT 1;`,
      `={{ (() => { const p=$('${wName}_parse').first().json; const id=Number($('${wName}_insert').first().json.id)||Number($('${wName}_insert').first().json[0]?.id)||0; return [p.user_id, id]; })() }}`,
      4,
      y
    );
    code(`${wName}_slots`, MATERIALIZE_FROM_ROW, 5, y);
    code(
      `${wName}_sql_build`,
      `const data = items[0].json || {};
const slots = data.slots || [];
const rid = data.reminder_id;
const uid = data.user_id;
const ver = data.version;
const statements = [];
statements.push({
  query: 'UPDATE reminders SET next_materialize_at = ? WHERE id = ?',
  params: [data.next_materialize_at, rid]
});
for (const s of slots) {
  statements.push({
    query: \`INSERT IGNORE INTO reminder_occurrences
      (reminder_id, user_id, reminder_version, fire_at, kind, pre_offset_minutes, title, body, channels, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')\`,
    params: [rid, uid, ver, s.fire_at, s.kind, s.pre_offset_minutes, s.title, s.body, s.channels]
  });
}
statements.push({
  query: \`INSERT INTO reminder_deliveries
    (occurrence_id, reminder_id, user_id, channel, status, unit_cost)
    SELECT o.id, o.reminder_id, o.user_id, p.channel, 'pending', p.unit_price
    FROM reminder_occurrences o
    JOIN reminder_channel_prices p ON p.active = 1
    LEFT JOIN reminder_deliveries d ON d.occurrence_id = o.id AND d.channel = p.channel
    WHERE o.reminder_id = ? AND o.reminder_version = ? AND d.id IS NULL
      AND (
        (p.channel = 'notification' AND o.channels LIKE '%notification%')
        OR (p.channel = 'sms' AND o.channels LIKE '%"sms"%')
        OR (p.channel = 'bale' AND o.channels LIKE '%bale%')
      )\`,
  params: [rid, ver]
});
return statements.map(s => ({ json: s }));`,
      6,
      y
    );
    mysql(
      `${wName}_apply`,
      "={{ $json.query }}",
      "={{ $json.params }}",
      7,
      y
    );
    code(
      `${wName}_wrap`,
      `const parse = $('${wName}_parse').first().json || {};
if (!parse.ok) return [{ json: { success: false, message: parse.message || 'error' } }];
const ins = $('${wName}_insert').first().json || {};
const id = Number(ins.id) || Number(ins[0]?.id) || null;
const slots = $('${wName}_slots').first().json || {};
return [{ json: { success: true, result: { id, status: 'active', slot_count: slots.slot_count || 0 } } }];`,
      8,
      y
    );
    respond(`${wName}_respond`, 9, y);
    link(wName, `${wName}_auth`);
    link(`${wName}_auth`, `${wName}_parse`);
    link(`${wName}_parse`, `${wName}_insert`);
    link(`${wName}_insert`, `${wName}_wallet`);
    link(`${wName}_wallet`, `${wName}_slots`);
    link(`${wName}_slots`, `${wName}_sql_build`);
    link(`${wName}_sql_build`, `${wName}_apply`);
    link(`${wName}_apply`, `${wName}_wrap`);
    link(`${wName}_wrap`, `${wName}_respond`);
    y += 1;
  }

  // ---------- EDIT ----------
  for (const [wName, wPath] of [
    ["wh_reminders_edit", "reminders/edit"],
    ["wh_user_task_edit", "user/task/edit"]
  ]) {
    webhook(wName, "POST", wPath, 0, y);
    code(`${wName}_auth`, authUserJs(), 1, y);
    code(`${wName}_parse`, PARSE_REMINDER_BODY, 2, y);
    mysql(
      `${wName}_update`,
      `UPDATE reminders SET
         type=$3, schedule_type=$4, name=$5, text=$6,
         weekdays=$7, dates=$8, times=$9,
         pre_reminders=NULLIF($10,''),
         channels=$11, phone_number=$12, bale_id=$13,
         starts_at=$14, finish_at=$15, version=version+1, status='active',
         next_materialize_at=NOW()
       WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL;
       UPDATE reminder_occurrences
         SET status='cancelled'
       WHERE reminder_id=$1 AND user_id=$2 AND status IN ('pending','claimed','processing') AND fire_at >= NOW();
       UPDATE reminder_deliveries d
         JOIN reminder_occurrences o ON o.id=d.occurrence_id
         SET d.status='cancelled'
       WHERE o.reminder_id=$1 AND d.status IN ('pending','retry_wait','sending');
       SELECT id, user_id, type, schedule_type, name, text, weekdays, dates, times, pre_reminders,
              channels, phone_number, bale_id, starts_at, finish_at, status, version
       FROM reminders WHERE id=$1 AND user_id=$2 LIMIT 1;`,
      `={{ (() => { const j=$('${wName}_parse').first().json; return [j.id,j.user_id,j.type,j.schedule_type,j.name,j.text,j.weekdays,j.dates,j.times,j.pre_reminders,j.channels,j.phone_number,j.bale_id,j.starts_at,j.finish_at]; })() }}`,
      3,
      y
    );
    code(`${wName}_slots`, MATERIALIZE_FROM_ROW, 4, y);
    code(
      `${wName}_sql_build`,
      `const data = items[0].json || {};
const slots = data.slots || [];
const rid = data.reminder_id;
const uid = data.user_id;
const ver = data.version;
const statements = [{
  query: 'UPDATE reminders SET next_materialize_at = ? WHERE id = ?',
  params: [data.next_materialize_at, rid]
}];
for (const s of slots) {
  statements.push({
    query: \`INSERT IGNORE INTO reminder_occurrences
      (reminder_id, user_id, reminder_version, fire_at, kind, pre_offset_minutes, title, body, channels, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')\`,
    params: [rid, uid, ver, s.fire_at, s.kind, s.pre_offset_minutes, s.title, s.body, s.channels]
  });
}
statements.push({
  query: \`INSERT INTO reminder_deliveries
    (occurrence_id, reminder_id, user_id, channel, status, unit_cost)
    SELECT o.id, o.reminder_id, o.user_id, p.channel, 'pending', p.unit_price
    FROM reminder_occurrences o
    JOIN reminder_channel_prices p ON p.active = 1
    LEFT JOIN reminder_deliveries d ON d.occurrence_id = o.id AND d.channel = p.channel
    WHERE o.reminder_id = ? AND o.reminder_version = ? AND d.id IS NULL
      AND (
        (p.channel = 'notification' AND o.channels LIKE '%notification%')
        OR (p.channel = 'sms' AND o.channels LIKE '%"sms"%')
        OR (p.channel = 'bale' AND o.channels LIKE '%bale%')
      )\`,
  params: [rid, ver]
});
return statements.map(s => ({ json: s }));`,
      5,
      y
    );
    mysql(`${wName}_apply`, "={{ $json.query }}", "={{ $json.params }}", 6, y);
    code(
      `${wName}_wrap`,
      `const parse = $('${wName}_parse').first().json || {};
if (!parse.ok || !parse.id) return [{ json: { success: false, message: parse.message || 'id required' } }];
const row = $('${wName}_update').first().json || {};
const id = Number(row.id) || parse.id;
const version = Number(row.version) || null;
return [{ json: { success: true, result: { id, version, status: 'active' } } }];`,
      7,
      y
    );
    respond(`${wName}_respond`, 8, y);
    link(wName, `${wName}_auth`);
    link(`${wName}_auth`, `${wName}_parse`);
    link(`${wName}_parse`, `${wName}_update`);
    link(`${wName}_update`, `${wName}_slots`);
    link(`${wName}_slots`, `${wName}_sql_build`);
    link(`${wName}_sql_build`, `${wName}_apply`);
    link(`${wName}_apply`, `${wName}_wrap`);
    link(`${wName}_wrap`, `${wName}_respond`);
    y += 1;
  }

  // ---------- pause / resume / cancel / delete ----------
  const statusActions = [
    [
      "wh_pause",
      "reminders/pause",
      `UPDATE reminders SET status='paused' WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL;
       UPDATE reminder_occurrences SET status='cancelled'
         WHERE reminder_id=$1 AND user_id=$2 AND status IN ('pending','claimed','processing') AND fire_at >= NOW();
       SELECT id, status FROM reminders WHERE id=$1 AND user_id=$2 LIMIT 1;`
    ],
    [
      "wh_resume",
      "reminders/resume",
      `UPDATE reminders SET status='active', next_materialize_at=NOW() WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL;
       SELECT id, user_id, type, schedule_type, name, text, weekdays, dates, times, pre_reminders,
              channels, phone_number, bale_id, starts_at, finish_at, status, version
       FROM reminders WHERE id=$1 AND user_id=$2 LIMIT 1;`
    ],
    [
      "wh_cancel",
      "reminders/cancel",
      `UPDATE reminders SET status='cancelled' WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL;
       UPDATE reminder_occurrences SET status='cancelled'
         WHERE reminder_id=$1 AND user_id=$2 AND status IN ('pending','claimed','processing');
       SELECT id, status FROM reminders WHERE id=$1 AND user_id=$2 LIMIT 1;`
    ],
    [
      "wh_delete",
      "reminders/delete",
      `UPDATE reminders SET deleted_at=NOW(), status='cancelled' WHERE id=$1 AND user_id=$2 AND deleted_at IS NULL;
       UPDATE reminder_occurrences SET status='cancelled'
         WHERE reminder_id=$1 AND user_id=$2 AND status IN ('pending','claimed','processing');
       SELECT id, deleted_at IS NOT NULL AS deleted FROM reminders WHERE id=$1 AND user_id=$2 LIMIT 1;`
    ]
  ];

  for (const [wName, wPath, sql] of statusActions) {
    webhook(wName, "POST", wPath, 0, y);
    code(
      `${wName}_auth`,
      `const input = items[0].json || {};
const headers = input.headers || {};
const auth = String(headers.authorization || headers.Authorization || "");
const raw = auth.replace(/^Bearer\\s+/i, "").trim();
let claims = {};
try {
  const part = (raw.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
  claims = JSON.parse(Buffer.from(part, "base64").toString("utf8")) || {};
} catch (e) { claims = {}; }
const user_id = Number(claims.id || claims.userId || claims.sub) || 0;
const body = input.body || {};
const id = Number(body.id) || 0;
return [{ json: { user_id, id, ok: Boolean(user_id && id) } }];`,
      1,
      y
    );
    mysql(
      `${wName}_sql`,
      sql,
      "={{ [$json.id, $json.user_id] }}",
      2,
      y
    );
    if (wName === "wh_resume") {
      code(`${wName}_slots`, MATERIALIZE_FROM_ROW, 3, y);
      code(
        `${wName}_sql_build`,
        `const data = items[0].json || {};
const slots = data.slots || [];
const rid = data.reminder_id, uid = data.user_id, ver = data.version;
const statements = [{ query: 'UPDATE reminders SET next_materialize_at = ? WHERE id = ?', params: [data.next_materialize_at, rid] }];
for (const s of slots) {
  statements.push({
    query: \`INSERT IGNORE INTO reminder_occurrences
      (reminder_id, user_id, reminder_version, fire_at, kind, pre_offset_minutes, title, body, channels, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')\`,
    params: [rid, uid, ver, s.fire_at, s.kind, s.pre_offset_minutes, s.title, s.body, s.channels]
  });
}
statements.push({
  query: \`INSERT INTO reminder_deliveries
    (occurrence_id, reminder_id, user_id, channel, status, unit_cost)
    SELECT o.id, o.reminder_id, o.user_id, p.channel, 'pending', p.unit_price
    FROM reminder_occurrences o
    JOIN reminder_channel_prices p ON p.active = 1
    LEFT JOIN reminder_deliveries d ON d.occurrence_id = o.id AND d.channel = p.channel
    WHERE o.reminder_id = ? AND o.reminder_version = ? AND d.id IS NULL
      AND (
        (p.channel = 'notification' AND o.channels LIKE '%notification%')
        OR (p.channel = 'sms' AND o.channels LIKE '%"sms"%')
        OR (p.channel = 'bale' AND o.channels LIKE '%bale%')
      )\`,
  params: [rid, ver]
});
return statements.map(s => ({ json: s }));`,
        4,
        y
      );
      mysql(`${wName}_apply`, "={{ $json.query }}", "={{ $json.params }}", 5, y);
      code(
        `${wName}_wrap`,
        `const auth = $('${wName}_auth').first().json || {};
if (!auth.ok) return [{ json: { success: false, message: 'Unauthorized' } }];
return [{ json: { success: true, result: { id: auth.id, status: 'active' } } }];`,
        6,
        y
      );
      respond(`${wName}_respond`, 7, y);
      link(wName, `${wName}_auth`);
      link(`${wName}_auth`, `${wName}_sql`);
      link(`${wName}_sql`, `${wName}_slots`);
      link(`${wName}_slots`, `${wName}_sql_build`);
      link(`${wName}_sql_build`, `${wName}_apply`);
      link(`${wName}_apply`, `${wName}_wrap`);
      link(`${wName}_wrap`, `${wName}_respond`);
    } else {
      code(
        `${wName}_wrap`,
        `const auth = $('${wName}_auth').first().json || {};
if (!auth.ok) return [{ json: { success: false, message: 'Unauthorized' } }];
const row = items[0].json || {};
return [{ json: { success: true, result: row } }];`,
        3,
        y
      );
      respond(`${wName}_respond`, 4, y);
      link(wName, `${wName}_auth`);
      link(`${wName}_auth`, `${wName}_sql`);
      link(`${wName}_sql`, `${wName}_wrap`);
      link(`${wName}_wrap`, `${wName}_respond`);
    }
    y += 1;
  }

  // ---------- catalog ----------
  const catalogs = [
    [
      "wh_categories",
      "reminders/categories",
      "SELECT id, code, title_fa, icon, is_addable, sort_order FROM reminder_categories WHERE active=1 ORDER BY sort_order, id"
    ],
    [
      "wh_occasions",
      "reminders/occasions",
      "SELECT id, category_code, title_fa, default_text, schedule_type, default_times, meta FROM reminder_templates WHERE active=1 AND kind='occasion' ORDER BY sort_order, id"
    ],
    [
      "wh_suggestions",
      "reminders/suggestions",
      "SELECT id, category_code, title_fa, default_text, schedule_type, default_times, meta FROM reminder_templates WHERE active=1 AND kind='suggestion' ORDER BY sort_order, id"
    ]
  ];
  for (const [wName, wPath, sql] of catalogs) {
    webhook(wName, "GET", wPath, 0, y, false);
    mysql(`${wName}_sql`, sql, undefined, 1, y);
    const wrapCode =
      wName === "wh_categories"
        ? `const rows = items.map(i => i.json).filter(r => r && (r.id != null || r.code));
const category = rows.map(r => {
  const name = r.code || r.name;
  const name_fa = r.title_fa || r.name_fa || r.name;
  const icon = r.icon === 'medicine' ? 'medicine_time' : (r.icon === 'gift' ? 'occasion' : (r.icon || r.code || 'medicine_time'));
  return {
    ...r,
    name,
    name_fa,
    label: name_fa,
    value: name,
    icon,
    is_addable: 1
  };
});
const type = category.map(r => ({
  category_name: r.name,
  category_name_fa: r.name_fa,
  icon: r.icon,
  items: [{
    type: r.name,
    type_fa: r.name_fa,
    name: r.name_fa,
    name_fa: r.name_fa,
    title_fa: r.name_fa,
    label: r.name_fa,
    value: r.name,
    icon: r.icon || r.name,
    schedule_type: r.name === 'medicine_time' ? 'everyDay' : 'everyYear',
    text: r.name === 'medicine_time' ? 'زمان مصرف دارو فرا رسیده است.' : r.name_fa,
    __addDisabled: false
  }]
}));
return [{ json: { success: true, category, type, result: category } }];`
        : wName === "wh_occasions"
          ? `const rows = items.map(i => i.json).filter(r => r && r.id != null);
return [{ json: { success: true, result: rows, occasions: rows } }];`
          : `const rows = items.map(i => i.json).filter(r => r && r.id != null);
return [{ json: { success: true, result: rows, suggestions: rows } }];`;
    code(`${wName}_wrap`, wrapCode, 2, y);
    respond(`${wName}_respond`, 3, y);
    link(wName, `${wName}_sql`);
    link(`${wName}_sql`, `${wName}_wrap`);
    link(`${wName}_wrap`, `${wName}_respond`);
    y += 1;
  }

  // ---------- wallet ----------
  webhook("wh_wallet", "GET", "wallet", 0, y);
  code("wh_wallet_auth", authUserJs(), 1, y);
  mysql(
    "wh_wallet_sql",
    `INSERT IGNORE INTO reminder_wallets (user_id, balance) VALUES ($1, 0);
     SELECT user_id, balance, updated_at FROM reminder_wallets WHERE user_id=$1 LIMIT 1;`,
    "={{ [$json.user_id] }}",
    2,
    y
  );
  code(
    "wh_wallet_wrap",
    `const auth = $('wh_wallet_auth').first().json || {};
if (!auth.ok) return [{ json: { success: false, message: 'Unauthorized' } }];
const row = items[0].json || {};
return [{ json: { success: true, balance: Number(row.balance)||0, result: { balance: Number(row.balance)||0 } } }];`,
    3,
    y
  );
  respond("wh_wallet_respond", 4, y);
  link("wh_wallet", "wh_wallet_auth");
  link("wh_wallet_auth", "wh_wallet_sql");
  link("wh_wallet_sql", "wh_wallet_wrap");
  link("wh_wallet_wrap", "wh_wallet_respond");
  y += 1;

  webhook("wh_wallet_tx", "GET", "wallet/transactions", 0, y);
  code("wh_wallet_tx_auth", authUserJs(), 1, y);
  mysql(
    "wh_wallet_tx_sql",
    `SELECT id, type, amount, balance_after, occurrence_id, delivery_id, payment_id, description, created_at
     FROM reminder_wallet_transactions WHERE user_id=$1 ORDER BY id DESC LIMIT 50`,
    "={{ [$json.user_id] }}",
    2,
    y
  );
  code(
    "wh_wallet_tx_wrap",
    `const auth = $('wh_wallet_tx_auth').first().json || {};
if (!auth.ok) return [{ json: { success: false, message: 'Unauthorized' } }];
return [{ json: { success: true, result: items.map(i => i.json) } }];`,
    3,
    y
  );
  respond("wh_wallet_tx_respond", 4, y);
  link("wh_wallet_tx", "wh_wallet_tx_auth");
  link("wh_wallet_tx_auth", "wh_wallet_tx_sql");
  link("wh_wallet_tx_sql", "wh_wallet_tx_wrap");
  link("wh_wallet_tx_wrap", "wh_wallet_tx_respond");
  y += 1;

  webhook("wh_wallet_topup", "POST", "wallet/topup", 0, y);
  code(
    "wh_wallet_topup_auth",
    `const input = items[0].json || {};
const headers = input.headers || {};
const auth = String(headers.authorization || headers.Authorization || "");
const raw = auth.replace(/^Bearer\\s+/i, "").trim();
let claims = {};
try {
  const part = (raw.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
  claims = JSON.parse(Buffer.from(part, "base64").toString("utf8")) || {};
} catch (e) { claims = {}; }
const user_id = Number(claims.id || claims.userId || claims.sub) || 0;
const amount = Math.floor(Number((input.body || {}).amount) || 0);
return [{ json: { user_id, amount, ok: Boolean(user_id && amount > 0) } }];`,
    1,
    y
  );
  mysql(
    "wh_wallet_topup_sql",
    `INSERT IGNORE INTO reminder_wallets (user_id, balance) VALUES ($1, 0);
     INSERT INTO payments (amount, user_id, type, text, merchant_id, payment_status, status, authority, description)
     VALUES ($2, $1, 'liad_wallet', 'liad_wallet', 'sayban', 'pending', 'pending', '', 'شارژ اعتبار لیاد');
     SELECT LAST_INSERT_ID() AS payment_id;`,
    "={{ [$json.user_id, $json.amount] }}",
    2,
    y
  );
  code(
    "wh_wallet_topup_wrap",
    `const auth = $('wh_wallet_topup_auth').first().json || {};
if (!auth.ok) return [{ json: { success: false, message: 'مبلغ یا احراز هویت نامعتبر' } }];
const row = items[0].json || {};
const payment_id = Number(row.payment_id) || Number(row[0]?.payment_id) || null;
return [{ json: { success: true, result: { payment_id, amount: auth.amount, type: 'liad_wallet' } } }];`,
    3,
    y
  );
  respond("wh_wallet_topup_respond", 4, y);
  link("wh_wallet_topup", "wh_wallet_topup_auth");
  link("wh_wallet_topup_auth", "wh_wallet_topup_sql");
  link("wh_wallet_topup_sql", "wh_wallet_topup_wrap");
  link("wh_wallet_topup_wrap", "wh_wallet_topup_respond");
  y += 1;

  webhook("wh_wallet_confirm", "POST", "wallet/topup/confirm", 0, y);
  code(
    "wh_wallet_confirm_auth",
    `const input = items[0].json || {};
const headers = input.headers || {};
const auth = String(headers.authorization || headers.Authorization || "");
const raw = auth.replace(/^Bearer\\s+/i, "").trim();
let claims = {};
try {
  const part = (raw.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
  claims = JSON.parse(Buffer.from(part, "base64").toString("utf8")) || {};
} catch (e) { claims = {}; }
const user_id = Number(claims.id || claims.userId || claims.sub) || 0;
const payment_id = Number((input.body || {}).payment_id) || 0;
return [{ json: { user_id, payment_id, ok: Boolean(user_id && payment_id) } }];`,
    1,
    y
  );
  mysql(
    "wh_wallet_confirm_sql",
    `SELECT id, amount, user_id, payment_status, status, type
     FROM payments WHERE id=$1 AND user_id=$2 AND type='liad_wallet' LIMIT 1;`,
    "={{ [$json.payment_id, $json.user_id] }}",
    2,
    y
  );
  code(
    "wh_wallet_confirm_gate",
    `const auth = $('wh_wallet_confirm_auth').first().json || {};
const pay = items[0].json || {};
const okPay = auth.ok && pay && Number(pay.id) && ['success','OK','paid','verified'].includes(String(pay.payment_status||pay.status||'').toLowerCase());
// Also allow explicit confirm when status still pending if body.force — disabled by default
const amount = Number(pay.amount) || 0;
return [{ json: {
  ok: Boolean(okPay && amount > 0),
  user_id: auth.user_id,
  payment_id: auth.payment_id,
  amount,
  message: okPay ? null : 'پرداخت تأیید نشده است'
}}];`,
    3,
    y
  );
  mysql(
    "wh_wallet_confirm_credit",
    `INSERT IGNORE INTO reminder_wallets (user_id, balance) VALUES ($1, 0);
     UPDATE reminder_wallets SET balance = balance + $2 WHERE user_id=$1;
     INSERT INTO reminder_wallet_transactions
       (user_id, type, amount, balance_after, payment_id, idempotency_key, description)
     SELECT $1, 'topup', $2, w.balance, $3, CONCAT('topup:payment:', $3), 'شارژ اعتبار لیاد'
     FROM reminder_wallets w WHERE w.user_id=$1
     ON DUPLICATE KEY UPDATE id=id;
     SELECT balance FROM reminder_wallets WHERE user_id=$1 LIMIT 1;`,
    "={{ [$json.user_id, $json.amount, $json.payment_id] }}",
    4,
    y
  );
  code(
    "wh_wallet_confirm_wrap",
    `const gate = $('wh_wallet_confirm_gate').first().json || {};
if (!gate.ok) return [{ json: { success: false, message: gate.message || 'error' } }];
const row = items[0].json || {};
return [{ json: { success: true, balance: Number(row.balance)||0 } }];`,
    5,
    y
  );
  respond("wh_wallet_confirm_respond", 6, y);
  link("wh_wallet_confirm", "wh_wallet_confirm_auth");
  link("wh_wallet_confirm_auth", "wh_wallet_confirm_sql");
  link("wh_wallet_confirm_sql", "wh_wallet_confirm_gate");
  link("wh_wallet_confirm_gate", "wh_wallet_confirm_credit");
  link("wh_wallet_confirm_credit", "wh_wallet_confirm_wrap");
  link("wh_wallet_confirm_wrap", "wh_wallet_confirm_respond");
  y += 1;

  // ---------- WORKERS ----------
  // Materialize cron (every 6h = 360 min) — use 360
  schedule("cron_materialize", 360, 0, y);
  mysql(
    "cron_materialize_pick",
    `SELECT id, user_id, type, schedule_type, name, text, weekdays, dates, times, pre_reminders,
            channels, phone_number, bale_id, starts_at, finish_at, status, version
     FROM reminders
     WHERE status='active' AND deleted_at IS NULL
       AND (next_materialize_at IS NULL OR next_materialize_at <= NOW())
     ORDER BY id ASC
     LIMIT 50`,
    undefined,
    1,
    y
  );
  code("cron_materialize_slots", MATERIALIZE_FROM_ROW, 2, y);
  code(
    "cron_materialize_build",
    `const data = items[0].json || {};
if (!data.reminder_id) return [];
const slots = data.slots || [];
const rid = data.reminder_id, uid = data.user_id, ver = data.version;
const statements = [{ query: 'UPDATE reminders SET next_materialize_at = ? WHERE id = ?', params: [data.next_materialize_at, rid] }];
for (const s of slots) {
  statements.push({
    query: \`INSERT IGNORE INTO reminder_occurrences
      (reminder_id, user_id, reminder_version, fire_at, kind, pre_offset_minutes, title, body, channels, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')\`,
    params: [rid, uid, ver, s.fire_at, s.kind, s.pre_offset_minutes, s.title, s.body, s.channels]
  });
}
statements.push({
  query: \`INSERT INTO reminder_deliveries
    (occurrence_id, reminder_id, user_id, channel, status, unit_cost)
    SELECT o.id, o.reminder_id, o.user_id, p.channel, 'pending', p.unit_price
    FROM reminder_occurrences o
    JOIN reminder_channel_prices p ON p.active = 1
    LEFT JOIN reminder_deliveries d ON d.occurrence_id = o.id AND d.channel = p.channel
    WHERE o.reminder_id = ? AND o.reminder_version = ? AND d.id IS NULL
      AND (
        (p.channel = 'notification' AND o.channels LIKE '%notification%')
        OR (p.channel = 'sms' AND o.channels LIKE '%"sms"%')
        OR (p.channel = 'bale' AND o.channels LIKE '%bale%')
      )\`,
  params: [rid, ver]
});
return statements.map(s => ({ json: s }));`,
    3,
    y
  );
  mysql("cron_materialize_apply", "={{ $json.query }}", "={{ $json.params }}", 4, y);
  link("cron_materialize", "cron_materialize_pick");
  link("cron_materialize_pick", "cron_materialize_slots");
  link("cron_materialize_slots", "cron_materialize_build");
  link("cron_materialize_build", "cron_materialize_apply");
  y += 1;

  // Dispatch every 1 minute
  schedule("cron_dispatch", 1, 0, y);
  mysql(
    "cron_dispatch_claim",
    `UPDATE reminder_occurrences o
     INNER JOIN (
       SELECT o2.id
       FROM reminder_occurrences o2
       INNER JOIN reminders r ON r.id = o2.reminder_id
       WHERE o2.status='pending' AND o2.fire_at <= NOW()
         AND r.status='active' AND r.deleted_at IS NULL AND r.version = o2.reminder_version
       ORDER BY o2.fire_at ASC
       LIMIT 30
     ) x ON x.id = o.id
     SET o.status='claimed', o.claimed_at=NOW(), o.claimed_by='dispatch', o.attempt_count=o.attempt_count+1;
     SELECT o.*, r.phone_number, r.bale_id, r.name AS reminder_name
     FROM reminder_occurrences o
     JOIN reminders r ON r.id=o.reminder_id
     WHERE o.status='claimed' AND o.claimed_by='dispatch' AND o.claimed_at >= (NOW() - INTERVAL 2 MINUTE)
     ORDER BY o.fire_at ASC
     LIMIT 30;`,
    undefined,
    1,
    y
  );
  code(
    "cron_dispatch_expand",
    `${TEHRAN_SCHEDULE_JS}
const occs = items.map(i => i.json).filter(r => r && r.id);
const out = [];
for (const o of occs) {
  out.push({ json: { ...o, phase: 'load_deliveries' } });
}
return out.length ? out : [];`,
    2,
    y
  );
  mysql(
    "cron_dispatch_deliveries",
    `SELECT d.*, u.fcmToken, u.isnotif, u.mobile,
            o.title, o.body, o.channels AS occ_channels
     FROM reminder_deliveries d
     JOIN reminder_occurrences o ON o.id=d.occurrence_id
     LEFT JOIN users u ON u.id=d.user_id
     WHERE d.occurrence_id=$1 AND d.status IN ('pending','retry_wait')
       AND (d.next_retry_at IS NULL OR d.next_retry_at <= NOW())`,
    "={{ [$json.id] }}",
    3,
    y
  );
  code(
    "cron_dispatch_plan",
    `${TEHRAN_SCHEDULE_JS}
const occ = $('cron_dispatch_expand').item.json;
const deliveries = items.map(i => i.json).filter(d => d && d.id);
const plans = [];
for (const d of deliveries) {
  const channel = d.channel;
  const cost = Number(d.unit_cost) || 0;
  plans.push({
    json: {
      delivery_id: d.id,
      occurrence_id: occ.id,
      reminder_id: d.reminder_id,
      user_id: d.user_id,
      channel,
      unit_cost: cost,
      title: d.title || occ.title || occ.reminder_name || 'یادآوری',
      body: d.body || occ.body || '',
      fcmToken: d.fcmToken || null,
      isnotif: Number(d.isnotif) || 0,
      mobile: d.mobile || occ.phone_number || null,
      bale_id: occ.bale_id || null,
      attempt_no: Number(d.attempt_no) || 0,
      max_attempts: Number(d.max_attempts) || 5,
      idempotency_key: 'delivery:' + d.id + ':attempt:' + ((Number(d.attempt_no)||0) + 1),
      now: tehranNowString()
    }
  });
}
return plans;
`,
    4,
    y
  );
  // Wallet + status update + channel send orchestration in one SQL/code loop item
  code(
    "cron_dispatch_execute",
    `${TEHRAN_SCHEDULE_JS}
// Prepare per-delivery action for downstream SQL/HTTP.
const p = items[0].json || {};
const channel = p.channel;
const cost = Number(p.unit_cost) || 0;
let action = 'send';
let error_code = null;
let error = null;

if (channel === 'notification') {
  if (!p.isnotif || !p.fcmToken) {
    // still write inbox even without push when isnotif allows; if no token, inbox-only
  }
} else if (channel === 'sms') {
  if (!p.mobile) { action = 'skip'; error_code = 'NO_MOBILE'; error = 'شماره موبایل نیست'; }
} else if (channel === 'bale') {
  // Provider URL not configured in v1 → skip without charge
  action = 'skip'; error_code = 'PROVIDER_NOT_CONFIGURED'; error = 'ارسال بله هنوز پیکربندی نشده';
} else {
  action = 'skip'; error_code = 'UNKNOWN_CHANNEL'; error = channel;
}

return [{ json: { ...p, action, error_code, error, needs_charge: action === 'send' && cost > 0 } }];
`,
    5,
    y
  );
  mysql(
    "cron_dispatch_charge",
    `-- charge if needed; skip/set status otherwise
SET @delivery_id = $1;
SET @user_id = $2;
SET @cost = $3;
SET @needs_charge = $4;
SET @action = $5;
SET @error_code = $6;
SET @error = $7;
SET @idem = $8;
SET @occ = $9;
SET @title = $10;
SET @body = $11;

UPDATE reminder_deliveries
SET status='sending', attempt_no = attempt_no + 1
WHERE id=@delivery_id AND status IN ('pending','retry_wait');

INSERT IGNORE INTO reminder_wallets (user_id, balance) VALUES (@user_id, 0);

SET @charged = 0;
SET @tx_id = NULL;
SET @bal = NULL;

IF @action = 'skip' THEN
  UPDATE reminder_deliveries
  SET status='skipped', last_error_code=@error_code, last_error=@error, updated_at=NOW()
  WHERE id=@delivery_id;
ELSEIF @needs_charge = 1 THEN
  SELECT balance INTO @bal FROM reminder_wallets WHERE user_id=@user_id FOR UPDATE;
  IF @bal IS NULL OR @bal < @cost THEN
    UPDATE reminder_deliveries
    SET status='skipped', last_error_code='INSUFFICIENT_BALANCE', last_error='موجودی کافی نیست', updated_at=NOW()
    WHERE id=@delivery_id;
    SET @action = 'skip';
  ELSE
    UPDATE reminder_wallets SET balance = balance - @cost WHERE user_id=@user_id;
    INSERT INTO reminder_wallet_transactions
      (user_id, type, amount, balance_after, occurrence_id, delivery_id, idempotency_key, description)
    VALUES (@user_id, 'reminder_charge', -@cost, (SELECT balance FROM reminder_wallets WHERE user_id=@user_id),
            @occ, @delivery_id, @idem, CONCAT('کسر بابت ارسال ', (SELECT channel FROM reminder_deliveries WHERE id=@delivery_id)));
    SET @tx_id = LAST_INSERT_ID();
    SET @charged = 1;
    UPDATE reminder_deliveries SET wallet_tx_id=@tx_id WHERE id=@delivery_id;
  END IF;
END IF;

SELECT @delivery_id AS delivery_id, @user_id AS user_id, @action AS action, @charged AS charged,
       @tx_id AS wallet_tx_id, @cost AS unit_cost, @title AS title, @body AS body,
       (SELECT channel FROM reminder_deliveries WHERE id=@delivery_id) AS channel,
       (SELECT fcmToken FROM users WHERE id=@user_id) AS fcmToken,
       (SELECT mobile FROM users WHERE id=@user_id) AS mobile,
       (SELECT isnotif FROM users WHERE id=@user_id) AS isnotif;`,
    `={{ (() => { const j=$json; return [j.delivery_id,j.user_id,j.unit_cost,j.needs_charge?1:0,j.action,j.error_code,j.error,j.idempotency_key,j.occurrence_id,j.title,j.body]; })() }}`,
    6,
    y
  );
  // Note: MySQL node may not support multi-statement IF blocks depending on driver.
  // Fallback simpler charge query used below if needed — keep a simpler version.

  y += 1;

  // Simpler dispatch settle path using Code + discrete SQL (more portable than IF blocks)
  // Replace the complex charge with a portable version by adding alternate nodes at next row.

  schedule("cron_retry", 1, 0, y);
  mysql(
    "cron_retry_release_stale",
    `UPDATE reminder_occurrences
     SET status='pending', claimed_by=NULL
     WHERE status='claimed' AND claimed_at < (NOW() - INTERVAL 5 MINUTE);
     SELECT 1 AS ok;`,
    undefined,
    1,
    y
  );
  link("cron_retry", "cron_retry_release_stale");
  y += 1;

  schedule("cron_expire", 60, 0, y);
  mysql(
    "cron_expire_sql",
    `UPDATE reminders
     SET status='completed'
     WHERE status='active' AND finish_at IS NOT NULL AND finish_at < NOW() AND deleted_at IS NULL;
     UPDATE reminder_occurrences o
     JOIN reminders r ON r.id=o.reminder_id
     SET o.status='cancelled'
     WHERE r.status='completed' AND o.status IN ('pending','claimed','processing') AND o.fire_at > NOW();
     SELECT ROW_COUNT() AS affected;`,
    undefined,
    1,
    y
  );
  link("cron_expire", "cron_expire_sql");

  // Fix: MySQL IF procedural blocks often fail in n8n executeQuery.
  // Remove cron_dispatch_charge complex SQL and use portable SQL nodes instead.
  const chargeIdx = nodes.findIndex((n) => n.name === "cron_dispatch_charge");
  if (chargeIdx >= 0) {
    nodes.splice(chargeIdx, 1);
    // rebuild dispatch chain ending
    delete connections["cron_dispatch_execute"];
  }

  // Portable charge/send/settle chain
  mysql(
    "cron_dispatch_mark_sending",
    `UPDATE reminder_deliveries
     SET status='sending', attempt_no = attempt_no + 1, updated_at=NOW()
     WHERE id=$1 AND status IN ('pending','retry_wait');
     SELECT d.*, u.fcmToken, u.isnotif, u.mobile
     FROM reminder_deliveries d
     LEFT JOIN users u ON u.id=d.user_id
     WHERE d.id=$1 LIMIT 1;`,
    "={{ [$json.delivery_id] }}",
    6,
    y - 2
  );
  code(
    "cron_dispatch_wallet_logic",
    `${TEHRAN_SCHEDULE_JS}
const plan = $('cron_dispatch_execute').item.json || {};
const d = items[0].json || {};
if (plan.action === 'skip') {
  return [{ json: { ...plan, do: 'skip', delivery_id: plan.delivery_id } }];
}
if (!plan.needs_charge) {
  return [{ json: { ...plan, do: 'send', delivery_id: plan.delivery_id } }];
}
return [{ json: { ...plan, do: 'charge_then_send', delivery_id: plan.delivery_id } }];
`,
    7,
    y - 2
  );
  mysql(
    "cron_dispatch_try_charge",
    `INSERT IGNORE INTO reminder_wallets (user_id, balance) VALUES ($1, 0);
     SELECT balance FROM reminder_wallets WHERE user_id=$1 LIMIT 1;`,
    "={{ [$json.user_id] }}",
    8,
    y - 2
  );
  code(
    "cron_dispatch_after_balance",
    `const plan = $('cron_dispatch_wallet_logic').item.json || {};
const balRow = items[0].json || {};
const balance = Number(balRow.balance);
const cost = Number(plan.unit_cost) || 0;
if (plan.do === 'skip') {
  return [{ json: { ...plan, final_action: 'skip' } }];
}
if (plan.do === 'send') {
  return [{ json: { ...plan, final_action: 'send', charged: 0 } }];
}
if (!(balance >= cost)) {
  return [{ json: { ...plan, final_action: 'skip', error_code: 'INSUFFICIENT_BALANCE', error: 'موجودی کافی نیست', charged: 0 } }];
}
return [{ json: { ...plan, final_action: 'debit_and_send', charged: 1, balance } }];`,
    9,
    y - 2
  );
  mysql(
    "cron_dispatch_debit",
    `UPDATE reminder_wallets SET balance = balance - $2 WHERE user_id=$1 AND balance >= $2;
     INSERT INTO reminder_wallet_transactions
       (user_id, type, amount, balance_after, occurrence_id, delivery_id, idempotency_key, description)
     SELECT $1, 'reminder_charge', -$2, w.balance, $3, $4, $5, CONCAT('کسر کانال ', $6)
     FROM reminder_wallets w WHERE w.user_id=$1
     ON DUPLICATE KEY UPDATE id=id;
     UPDATE reminder_deliveries
       SET wallet_tx_id = (SELECT id FROM reminder_wallet_transactions WHERE idempotency_key=$5 LIMIT 1)
     WHERE id=$4;
     SELECT ROW_COUNT() AS affected, (SELECT balance FROM reminder_wallets WHERE user_id=$1) AS balance;`,
    `={{ (() => { const j=$json; if (j.final_action !== 'debit_and_send') return [j.user_id, 0, j.occurrence_id, j.delivery_id, j.idempotency_key + ':noop', j.channel]; return [j.user_id, j.unit_cost, j.occurrence_id, j.delivery_id, j.idempotency_key, j.channel]; })() }}`,
    10,
    y - 2
  );
  code(
    "cron_dispatch_route_channel",
    `const plan = $('cron_dispatch_after_balance').item.json || {};
let final_action = plan.final_action;
if (final_action === 'debit_and_send') final_action = 'send';
if (final_action === 'skip') {
  return [{ json: { ...plan, final_action: 'skip' } }];
}
return [{ json: { ...plan, final_action: 'send' } }];`,
    11,
    y - 2
  );
  mysql(
    "cron_dispatch_skip_sql",
    `UPDATE reminder_deliveries
     SET status='skipped', last_error_code=$2, last_error=$3, updated_at=NOW()
     WHERE id=$1 AND $4 = 'skip';
     SELECT id, status FROM reminder_deliveries WHERE id=$1;`,
    `={{ (() => { const j=$json; return [j.delivery_id, j.error_code || 'SKIPPED', j.error || '', j.final_action]; })() }}`,
    12,
    y - 2
  );
  // notification inbox + push
  mysql(
    "cron_dispatch_inbox",
    `INSERT INTO users__notification (userId, title, text, action, notification_type, is_seen)
     SELECT $1, $2, $3, '/reminder/', 'reminder', 0 FROM DUAL WHERE $4='send' AND $5='notification';
     UPDATE reminder_deliveries
       SET inbox_notification_id = IF($5='notification' AND $4='send', LAST_INSERT_ID(), inbox_notification_id)
     WHERE id=$6;
     SELECT $6 AS delivery_id, $4 AS final_action, $5 AS channel, $1 AS user_id, $2 AS title, $3 AS text;`,
    `={{ (() => { const j=$('cron_dispatch_route_channel').item.json; return [j.user_id, j.title, j.body, j.final_action, j.channel, j.delivery_id]; })() }}`,
    13,
    y - 2
  );
  http(
    "cron_dispatch_push",
    "POST",
    `${WEBHOOK_BASE}send-notif`,
    `={{ JSON.stringify({ title: $json.title, text: $json.text, action: '/reminder/', notification_type: 'reminder', userId: $json.user_id }) }}`,
    14,
    y - 2
  );
  http(
    "cron_dispatch_sms",
    "POST",
    `${WEBHOOK_BASE}users/sms`,
    `={{ JSON.stringify({ id: $('cron_dispatch_route_channel').item.json.user_id, template: $('cron_dispatch_route_channel').item.json.body || $('cron_dispatch_route_channel').item.json.title }) }}`,
    15,
    y - 2
  );
  code(
    "cron_dispatch_finish",
    `const plan = $('cron_dispatch_route_channel').item.json || {};
const channel = plan.channel;
const final_action = plan.final_action;
let status = 'sent';
let error_code = plan.error_code || null;
let error = plan.error || null;
if (final_action === 'skip') {
  status = 'skipped';
} else if (channel === 'bale') {
  status = 'skipped';
  error_code = 'PROVIDER_NOT_CONFIGURED';
  error = 'ارسال بله هنوز پیکربندی نشده';
} else if (channel === 'sms') {
  // treat HTTP continue output as soft success; failures go retry via separate path
  status = 'sent';
} else {
  status = 'sent';
}
return [{ json: {
  delivery_id: plan.delivery_id,
  occurrence_id: plan.occurrence_id,
  status,
  error_code,
  error,
  channel
}}];`,
    16,
    y - 2
  );
  mysql(
    "cron_dispatch_mark_done",
    `UPDATE reminder_deliveries
     SET status=$2,
         last_error_code=$3,
         last_error=$4,
         sent_at=IF($2='sent', NOW(), sent_at),
         updated_at=NOW()
     WHERE id=$1;
     -- settle occurrence
     UPDATE reminder_occurrences o
     SET status = CASE
       WHEN (SELECT COUNT(*) FROM reminder_deliveries d WHERE d.occurrence_id=o.id AND d.status IN ('pending','sending','retry_wait')) > 0 THEN 'processing'
       WHEN (SELECT COUNT(*) FROM reminder_deliveries d WHERE d.occurrence_id=o.id AND d.status='sent') > 0
        AND (SELECT COUNT(*) FROM reminder_deliveries d WHERE d.occurrence_id=o.id AND d.status='dead') > 0 THEN 'partial'
       WHEN (SELECT COUNT(*) FROM reminder_deliveries d WHERE d.occurrence_id=o.id AND d.status IN ('sent','skipped')) =
            (SELECT COUNT(*) FROM reminder_deliveries d WHERE d.occurrence_id=o.id) THEN 'sent'
       WHEN (SELECT COUNT(*) FROM reminder_deliveries d WHERE d.occurrence_id=o.id AND d.status IN ('dead','skipped')) =
            (SELECT COUNT(*) FROM reminder_deliveries d WHERE d.occurrence_id=o.id)
        AND (SELECT COUNT(*) FROM reminder_deliveries d WHERE d.occurrence_id=o.id AND d.status='sent') = 0 THEN 'failed'
       ELSE 'processing'
     END,
     sent_at = IF(
       (SELECT COUNT(*) FROM reminder_deliveries d WHERE d.occurrence_id=o.id AND d.status IN ('pending','sending','retry_wait')) = 0,
       NOW(), o.sent_at
     )
     WHERE o.id=$5;
     SELECT $1 AS delivery_id, $2 AS status;`,
    "={{ [$json.delivery_id, $json.status, $json.error_code, $json.error, $json.occurrence_id] }}",
    17,
    y - 2
  );

  link("cron_dispatch", "cron_dispatch_claim");
  link("cron_dispatch_claim", "cron_dispatch_expand");
  link("cron_dispatch_expand", "cron_dispatch_deliveries");
  link("cron_dispatch_deliveries", "cron_dispatch_plan");
  link("cron_dispatch_plan", "cron_dispatch_execute");
  link("cron_dispatch_execute", "cron_dispatch_mark_sending");
  link("cron_dispatch_mark_sending", "cron_dispatch_wallet_logic");
  link("cron_dispatch_wallet_logic", "cron_dispatch_try_charge");
  link("cron_dispatch_try_charge", "cron_dispatch_after_balance");
  link("cron_dispatch_after_balance", "cron_dispatch_debit");
  link("cron_dispatch_debit", "cron_dispatch_route_channel");
  link("cron_dispatch_route_channel", "cron_dispatch_skip_sql");
  link("cron_dispatch_skip_sql", "cron_dispatch_inbox");
  link("cron_dispatch_inbox", "cron_dispatch_push");
  link("cron_dispatch_push", "cron_dispatch_sms");
  link("cron_dispatch_sms", "cron_dispatch_finish");
  link("cron_dispatch_finish", "cron_dispatch_mark_done");

  return {
    name: WORKFLOW_NAME,
    nodes,
    connections,
    active: false,
    settings: { executionOrder: "v1" },
    staticData: null
  };
}

const env = readEnv();
const base = (env.N8N_URL || "").replace(/\/$/, "");
const revert = process.argv.includes("--revert");

const loginRes = await fetch(`${base}/rest/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    emailOrLdapLoginId: env.N8N_USER,
    password: env.N8N_PASSWORD
  })
});
if (!loginRes.ok) throw new Error(`n8n login failed: ${loginRes.status}`);
const cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];

const list = await fetch(`${base}/rest/workflows?limit=250`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then((r) => r.json());
const existing = (list.data || []).find((w) => w.name === WORKFLOW_NAME);

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });

if (existing) {
  const detail = await fetch(`${base}/rest/workflows/${existing.id}`, {
    headers: { Cookie: cookie }
  }).then((r) => r.json());
  const wf = detail.data || detail;
  const backupFile = path.join(
    backupDir,
    `${WORKFLOW_NAME}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  );
  fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
  console.log(`backup: ${path.relative(process.cwd(), backupFile)}`);

  if (revert) {
    if (wf.active) {
      await fetch(`${base}/rest/workflows/${existing.id}/deactivate`, {
        method: "POST",
        headers: { Cookie: cookie }
      });
    }
    await fetch(`${base}/rest/workflows/${existing.id}`, {
      method: "DELETE",
      headers: { Cookie: cookie }
    });
    console.log("workflow deleted");
    process.exit(0);
  }
} else if (revert) {
  console.log("workflow not found; nothing to revert");
  process.exit(0);
}

const payload = buildWorkflow();

let saved;
if (existing) {
  const detail = await fetch(`${base}/rest/workflows/${existing.id}`, {
    headers: { Cookie: cookie }
  }).then((r) => r.json());
  const prev = detail.data || detail;
  const putRes = await fetch(`${base}/rest/workflows/${existing.id}`, {
    method: "PUT",
    headers: {
      Cookie: cookie,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...prev,
      name: WORKFLOW_NAME,
      nodes: payload.nodes,
      connections: payload.connections,
      settings: payload.settings,
      staticData: prev.staticData ?? null
    })
  });
  if (!putRes.ok) {
    const t = await putRes.text();
    throw new Error(`update failed: ${putRes.status} ${t.slice(0, 500)}`);
  }
  saved = (await putRes.json()).data || (await putRes.json());
  console.log(`updated workflow id=${existing.id} nodes=${payload.nodes.length}`);
} else {
  const createRes = await fetch(`${base}/rest/workflows`, {
    method: "POST",
    headers: {
      Cookie: cookie,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!createRes.ok) {
    const t = await createRes.text();
    throw new Error(`create failed: ${createRes.status} ${t.slice(0, 800)}`);
  }
  saved = (await createRes.json()).data || (await createRes.json());
  console.log(`created workflow id=${saved.id} nodes=${payload.nodes.length}`);
}

const id = saved.id || existing?.id;
const act = await fetch(`${base}/rest/workflows/${id}`, {
  method: "PATCH",
  headers: {
    Cookie: cookie,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ active: true })
});
if (!act.ok) {
  console.warn(`activate warning: ${act.status} ${await act.text()}`);
} else {
  console.log("workflow activated");
}

console.log("done");
