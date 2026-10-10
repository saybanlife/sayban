/**
 * Patch reminders cron_dispatch:
 * - Notification title/text from reminder_templates.title_fa / default_text
 * - SMS template from reminder_templates.template (never reminders.text)
 * - Test allowlist: only mobile 09228951264 receives notification/SMS
 * - Bale untouched
 *
 *   node scripts/patch-n8n-reminders-template-dispatch.mjs
 */
import fs from "node:fs";
import path from "node:path";

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

const TPL_PICK = `(
  SELECT t.%%COL%% FROM reminder_templates t
  WHERE t.active=1 AND (
    t.title_fa = r.name OR t.category_code = r.type OR t.template = r.type
  )
  ORDER BY
    CASE WHEN t.title_fa = r.name THEN 0 ELSE 1 END,
    CASE WHEN t.category_code = r.type THEN 0 ELSE 1 END,
    t.sort_order, t.id
  LIMIT 1
)`;

const CLAIM_QUERY = `UPDATE reminder_occurrences o
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
     SELECT o.*, r.phone_number, r.bale_id, r.name AS reminder_name, r.type AS reminder_type,
       ${TPL_PICK.replace("%%COL%%", "title_fa")} AS tpl_title_fa,
       ${TPL_PICK.replace("%%COL%%", "default_text")} AS tpl_default_text,
       ${TPL_PICK.replace("%%COL%%", "template")} AS tpl_sms_template
     FROM reminder_occurrences o
     JOIN reminders r ON r.id=o.reminder_id
     WHERE o.status='claimed' AND o.claimed_by='dispatch' AND o.claimed_at >= (NOW() - INTERVAL 2 MINUTE)
     ORDER BY o.fire_at ASC
     LIMIT 30;`;

const PLAN_JS = `const occ = $('cron_dispatch_expand').item.json;
const deliveries = items.map(i => i.json).filter(d => d && d.id);
const plans = [];
function normMobile(m) {
  let s = String(m || '').replace(/\\D/g, '');
  if (s.startsWith('98') && s.length === 12) s = '0' + s.slice(2);
  if (s.length === 10 && s.startsWith('9')) s = '0' + s;
  return s;
}
for (const d of deliveries) {
  const channel = d.channel;
  const cost = Number(d.unit_cost) || 0;
  const title = d.tpl_title_fa || occ.tpl_title_fa || 'یادآوری';
  const body = d.tpl_default_text || occ.tpl_default_text || '';
  const sms_template = d.tpl_sms_template || occ.tpl_sms_template || '';
  plans.push({
    json: {
      delivery_id: d.id,
      occurrence_id: occ.id,
      reminder_id: d.reminder_id,
      user_id: d.user_id,
      channel,
      unit_cost: cost,
      title,
      body,
      sms_template,
      fcmToken: d.fcmToken || null,
      isnotif: Number(d.isnotif) || 0,
      mobile: d.mobile || occ.phone_number || null,
      mobile_norm: normMobile(d.mobile || occ.phone_number || null),
      bale_id: occ.bale_id || null,
      attempt_no: Number(d.attempt_no) || 0,
      max_attempts: Number(d.max_attempts) || 5,
      idempotency_key: 'delivery:' + d.id + ':attempt:' + ((Number(d.attempt_no)||0) + 1),
      now: (typeof tehranNowString === 'function' ? tehranNowString() : null)
    }
  });
}
return plans;
`;

const EXECUTE_JS = `const p = items[0].json || {};
const channel = p.channel;
const cost = Number(p.unit_cost) || 0;
let action = 'send';
let error_code = null;
let error = null;
const TEST_MOBILE = '09228951264';
function normMobile(m) {
  let s = String(m || '').replace(/\\D/g, '');
  if (s.startsWith('98') && s.length === 12) s = '0' + s.slice(2);
  if (s.length === 10 && s.startsWith('9')) s = '0' + s;
  return s;
}
const mobileNorm = p.mobile_norm || normMobile(p.mobile);

// Temporary test gate: only this mobile receives notification/SMS
if ((channel === 'notification' || channel === 'sms') && mobileNorm !== TEST_MOBILE) {
  action = 'skip';
  error_code = 'TEST_ALLOWLIST';
  error = 'تست: فقط شماره مجاز';
} else if (channel === 'notification') {
  // inbox/push even without fcm when allowed
} else if (channel === 'sms') {
  if (!p.mobile) { action = 'skip'; error_code = 'NO_MOBILE'; error = 'شماره موبایل نیست'; }
  else if (!p.sms_template) { action = 'skip'; error_code = 'NO_SMS_TEMPLATE'; error = 'قالب پیامک یافت نشد'; }
} else if (channel === 'bale') {
  action = 'skip'; error_code = 'PROVIDER_NOT_CONFIGURED'; error = 'ارسال بله هنوز پیکربندی نشده';
} else {
  action = 'skip'; error_code = 'UNKNOWN_CHANNEL'; error = channel;
}

return [{ json: { ...p, action, error_code, error, needs_charge: action === 'send' && cost > 0 } }];
`;

const SMS_BODY = `={{ JSON.stringify({ id: $('cron_dispatch_route_channel').item.json.user_id, template: $('cron_dispatch_route_channel').item.json.sms_template }) }}`;

const PUSH_BODY = `={{ (() => {
  const plan = $('cron_dispatch_route_channel').item.json || {};
  const row = $json || {};
  return JSON.stringify({
    title: row.title || plan.title || 'یادآوری',
    text: row.text || plan.body || '',
    action: '/reminder/',
    notification_type: 'reminder',
    userId: Number(row.user_id || plan.user_id) || 0,
    isSendNow: true,
    isSaveData: true
  });
})() }}`;

const DELIVERIES_QUERY = `SELECT d.*, u.fcmToken, u.isnotif, u.mobile,
            o.title, o.body, o.channels AS occ_channels,
            (
              SELECT t.title_fa FROM reminder_templates t
              JOIN reminders r2 ON r2.id = d.reminder_id
              WHERE t.active=1 AND (
                t.title_fa = r2.name OR t.category_code = r2.type OR t.template = r2.type
              )
              ORDER BY
                CASE WHEN t.title_fa = r2.name THEN 0 ELSE 1 END,
                CASE WHEN t.category_code = r2.type THEN 0 ELSE 1 END,
                t.sort_order, t.id
              LIMIT 1
            ) AS tpl_title_fa,
            (
              SELECT t.default_text FROM reminder_templates t
              JOIN reminders r2 ON r2.id = d.reminder_id
              WHERE t.active=1 AND (
                t.title_fa = r2.name OR t.category_code = r2.type OR t.template = r2.type
              )
              ORDER BY
                CASE WHEN t.title_fa = r2.name THEN 0 ELSE 1 END,
                CASE WHEN t.category_code = r2.type THEN 0 ELSE 1 END,
                t.sort_order, t.id
              LIMIT 1
            ) AS tpl_default_text,
            (
              SELECT t.template FROM reminder_templates t
              JOIN reminders r2 ON r2.id = d.reminder_id
              WHERE t.active=1 AND (
                t.title_fa = r2.name OR t.category_code = r2.type OR t.template = r2.type
              )
              ORDER BY
                CASE WHEN t.title_fa = r2.name THEN 0 ELSE 1 END,
                CASE WHEN t.category_code = r2.type THEN 0 ELSE 1 END,
                t.sort_order, t.id
              LIMIT 1
            ) AS tpl_sms_template
     FROM reminder_deliveries d
     JOIN reminder_occurrences o ON o.id=d.occurrence_id
     LEFT JOIN users u ON u.id=d.user_id
     WHERE d.occurrence_id=$1 AND d.status IN ('pending','retry_wait')
       AND (d.next_retry_at IS NULL OR d.next_retry_at <= NOW())`;

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
if (!loginRes.ok) throw new Error(`n8n login failed: ${loginRes.status}`);
const cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];

const list = await fetch(`${base}/rest/workflows?limit=250`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const summary = (list.data || []).find(w => w.name === "reminders");
if (!summary) throw new Error("reminders workflow missing");

const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
  headers: { Cookie: cookie }
}).then(r => r.json());
const wf = detail.data || detail;

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(
  backupDir,
  `reminders-template-dispatch-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
console.log("backup", path.relative(process.cwd(), backupFile));

const nodes = wf.nodes || [];
const byName = name => nodes.find(n => n.name === name);

function setCodeJs(node, js) {
  if (!node) throw new Error("missing node");
  // Preserve TEHRAN_SCHEDULE_JS prefix if present in existing jsCode
  const prev = String(node.parameters?.jsCode || "");
  const hasTehran =
    prev.includes("function tehranNowString") ||
    prev.includes("tehranParts");
  // PLAN_JS references tehranNowString optionally; EXECUTE does not need helpers.
  const needsHelpers = js.includes("tehranNowString()");
  let helpers = "";
  if (needsHelpers && hasTehran) {
    const marker = "const occ =";
    const idx = prev.indexOf(marker);
    helpers = idx > 0 ? prev.slice(0, idx) : "";
  }
  node.parameters = {
    ...node.parameters,
    jsCode: helpers + js
  };
}

const claim = byName("cron_dispatch_claim");
const deliveries = byName("cron_dispatch_deliveries");
const plan = byName("cron_dispatch_plan");
const execute = byName("cron_dispatch_execute");
const push = byName("cron_dispatch_push");
const sms = byName("cron_dispatch_sms");
if (!claim || !deliveries || !plan || !execute || !push || !sms) {
  throw new Error("required dispatch nodes missing");
}

claim.parameters = {
  ...claim.parameters,
  operation: "executeQuery",
  query: CLAIM_QUERY
};

deliveries.parameters = {
  ...deliveries.parameters,
  operation: "executeQuery",
  query: DELIVERIES_QUERY,
  options: {
    ...(deliveries.parameters?.options || {}),
    queryReplacement: "={{ [$json.id] }}"
  }
};

// Keep Tehran helpers already on plan node if any
{
  const prev = String(plan.parameters?.jsCode || "");
  const marker = "const occ =";
  const idx = prev.indexOf(marker);
  const helpers = idx > 0 ? prev.slice(0, idx) : "";
  plan.parameters = { ...plan.parameters, jsCode: helpers + PLAN_JS };
}

{
  const prev = String(execute.parameters?.jsCode || "");
  const marker = "const p = items[0].json";
  const idx = prev.indexOf(marker);
  const helpers = idx > 0 ? prev.slice(0, idx) : "";
  execute.parameters = { ...execute.parameters, jsCode: helpers + EXECUTE_JS };
}

push.parameters = {
  ...push.parameters,
  method: "POST",
  url: "https://sayban.darkube.ir/webhook/send-notif",
  sendBody: true,
  specifyBody: "json",
  jsonBody: PUSH_BODY,
  options: { ...(push.parameters?.options || {}), timeout: 15000 }
};
push.onError = "continueRegularOutput";

sms.parameters = {
  ...sms.parameters,
  method: "POST",
  url: "https://sayban.darkube.ir/webhook/users/sms",
  sendBody: true,
  specifyBody: "json",
  jsonBody: SMS_BODY,
  options: { ...(sms.parameters?.options || {}), timeout: 15000 }
};
sms.onError = "continueRegularOutput";

const put = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: {
    Cookie: cookie,
    "Content-Type": "application/json",
    Accept: "application/json"
  },
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
if (!put.ok) {
  const t = await put.text();
  throw new Error(`patch failed ${put.status}: ${t.slice(0, 400)}`);
}
console.log("patched reminders template dispatch + test allowlist ok");
