/**
 * Add POST report/insert to Sayban `reminders` workflow (Liad cost preview).
 *   node scripts/patch-n8n-report-insert.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

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

const REPORT_JS = `const input = items[0].json || {};
const body = input.body || input;
const rem = (body && body.data && typeof body.data === 'object') ? body.data : body;

function parseArr(v) {
  if (v == null || v === '' || v === '{') return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}
function normSchedule(raw) {
  const s = String(raw || '').trim();
  if (s === 'every_day' || s === 'everyDay') return 'everyDay';
  if (s === 'every_year' || s === 'everyYear') return 'everyYear';
  if (s === 'once') return 'once';
  return s || 'everyDay';
}

const schedule_type = normSchedule(rem.schedule_type);
const times = parseArr(rem.times);
const timesPerDay = times.length || 0;
const preRaw = Array.isArray(rem.pre) ? rem.pre : parseArr(rem.pre_reminders);
const preCount = preRaw.filter(x => x != null && x !== '').length;

const startDate = new Date();
startDate.setHours(0,0,0,0);
const endDate = new Date(startDate);
endDate.setMonth(endDate.getMonth() + 1);
let horizonEnd = new Date(endDate);
const finishAt = rem.finishTime || rem.finish_at;
if (finishAt) {
  const finish = new Date(String(finishAt));
  if (!Number.isNaN(finish.getTime()) && finish < horizonEnd) horizonEnd = finish;
}

let activeDays = 0;
const dates = parseArr(rem.dates);
if (schedule_type === 'everyYear' || schedule_type === 'once') {
  activeDays = Math.max(dates.length, 1);
} else {
  const weekdays = parseArr(rem.weekdays).map(w => String(w).toLowerCase());
  const weekdaySet = new Set(weekdays);
  const cursor = new Date(startDate);
  while (cursor <= horizonEnd) {
    if (!weekdaySet.size) activeDays += 1;
    else {
      const name = cursor.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      if (weekdaySet.has(name)) activeDays += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
}

const totalNotifications = activeDays * timesPerDay + preCount;
const period = schedule_type === 'everyDay' ? 'ماه' : 'سال';
const unit = { notification: 0, sms: 500, bale: 200, telegram: 0 };
const costs = {
  notification: unit.notification * totalNotifications,
  sms: unit.sms * totalNotifications,
  bale: unit.bale * totalNotifications,
  telegram: 0
};
const icons = {
  notification: 'https://teh-3.s3.poshtiban.com/lioms3/2026-06/panel/liad/2026-06-06-b48be7d5-b980-46c1-8232-72fa509d5524.png',
  sms: 'https://teh-3.s3.poshtiban.com/lioms3/2026-06/panel/liad/2026-06-06-5a0251eb-b32f-4320-991f-4d5781300499.png',
  bale: 'https://teh-3.s3.poshtiban.com/lioms3/2026-06/panel/liad/2026-06-06-14b8291c-5c9e-442d-acca-c6ef11d51b2a.png'
};

return [{ json: {
  results: [{
    name: rem.name || rem.title || '',
    schedule_type,
    timesPerDay,
    activeDays,
    preCount,
    totalNotifications,
    totalLabel: totalNotifications + ' عدد در ' + period,
    costs,
    totalCost: 0,
    startDate: startDate.toISOString(),
    endDate: horizonEnd.toISOString()
  }],
  total: 0,
  totalNotifications,
  totalPerChannel: [
    { icon_path: icons.notification, type: 'notification', name: 'نوتیفیکیشن/اپ', value: unit.notification },
    { icon_path: icons.sms, type: 'sms', name: 'پیامک', value: unit.sms },
    { icon_path: icons.bale, type: 'bale', name: 'بله', value: unit.bale }
  ]
}}];`;

const env = readEnv();
const base = (env.N8N_URL || "").replace(/\/$/, "");
const loginRes = await fetch(`${base}/rest/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    emailOrLdapLoginId: env.N8N_USER,
    password: env.N8N_PASSWORD
  })
});
if (!loginRes.ok) throw new Error(`login ${loginRes.status}`);
const cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];

const list = await fetch(`${base}/rest/workflows?limit=250`, {
  headers: { Cookie: cookie }
}).then((r) => r.json());
const summary = (list.data || []).find((w) => w.name === "reminders");
if (!summary) throw new Error("reminders workflow missing");

const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
  headers: { Cookie: cookie }
}).then((r) => r.json());
const wf = detail.data || detail;

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
fs.writeFileSync(
  path.join(
    backupDir,
    `reminders-report-insert-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  ),
  JSON.stringify(wf, null, 1),
  "utf8"
);

const WH = "wh_report_insert";
const CODE = "wh_report_insert_code";
const RESP = "wh_report_insert_respond";

let changed = false;
const existing = wf.nodes.find((n) => n.name === WH);
if (existing) {
  const codeNode = wf.nodes.find((n) => n.name === CODE);
  if (codeNode) {
    codeNode.parameters.jsCode = REPORT_JS;
    console.log("updated", CODE);
    changed = true;
  }
} else {
  const id = () => crypto.randomUUID();
  const y = Math.max(...wf.nodes.map((n) => n.position?.[1] || 0)) + 220;
  wf.nodes.push(
    {
      parameters: {
        httpMethod: "POST",
        path: "report/insert",
        authentication: "none",
        responseMode: "responseNode",
        options: {}
      },
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [0, y],
      id: id(),
      name: WH,
      webhookId: id()
    },
    {
      parameters: { jsCode: REPORT_JS },
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [280, y],
      id: id(),
      name: CODE
    },
    {
      parameters: { options: {} },
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: 1.1,
      position: [560, y],
      id: id(),
      name: RESP
    }
  );
  wf.connections = wf.connections || {};
  wf.connections[WH] = {
    main: [[{ node: CODE, type: "main", index: 0 }]]
  };
  wf.connections[CODE] = {
    main: [[{ node: RESP, type: "main", index: 0 }]]
  };
  console.log("added", WH, CODE, RESP);
  changed = true;
}

if (!changed) {
  console.log("nothing to change");
  process.exit(0);
}

const patch = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings,
    staticData: wf.staticData ?? null,
    active: true,
    ...(wf.versionId ? { versionId: wf.versionId } : {})
  })
});
if (!patch.ok) throw new Error(`patch ${patch.status} ${await patch.text()}`);

// Ensure workflow stays active (webhook registration).
await fetch(`${base}/rest/workflows/${summary.id}/activate`, {
  method: "POST",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: "{}"
}).catch(() => null);

console.log("done");
