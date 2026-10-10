/**
 * Fix reminders cron_dispatch to process ALL deliveries in one run.
 *
 * Fixes:
 * 1) Claim was UPDATE+SELECT in one MySQL node (often only 1 row reaches expand)
 * 2) Code nodes collapsed batches via items[0] / runOnceForAllItems
 *
 * New flow:
 *   claim (UPDATE only) → deliveries (ALL pending for recently claimed occs)
 *   → plan/execute/... each in runOnceForEachItem
 *
 *   node scripts/patch-n8n-reminders-dispatch-batch.mjs
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
      .filter(line => line.trim() && !line.trim().startsWith("#"))
      .map(line => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      })
  );
}

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
SELECT ROW_COUNT() AS claimed_count;`;

const TPL = col => `(
  SELECT t.${col} FROM reminder_templates t
  WHERE t.active=1 AND (
    t.title_fa = r.name OR t.category_code = r.type OR t.template = r.type
  )
  ORDER BY
    CASE WHEN t.title_fa = r.name THEN 0 ELSE 1 END,
    CASE WHEN t.category_code = r.type THEN 0 ELSE 1 END,
    t.sort_order, t.id
  LIMIT 1
)`;

const DELIVERIES_QUERY = `SELECT d.*, u.fcmToken, u.isnotif, u.mobile,
       o.id AS occurrence_id, o.fire_at,
       r.phone_number, r.bale_id, r.name AS reminder_name, r.type AS reminder_type,
       ${TPL("title_fa")} AS tpl_title_fa,
       ${TPL("default_text")} AS tpl_default_text,
       ${TPL("template")} AS tpl_sms_template
FROM reminder_deliveries d
JOIN reminder_occurrences o ON o.id = d.occurrence_id
JOIN reminders r ON r.id = d.reminder_id
LEFT JOIN users u ON u.id = d.user_id
WHERE o.status='claimed'
  AND o.claimed_by='dispatch'
  AND o.claimed_at >= (NOW() - INTERVAL 2 MINUTE)
  AND d.status IN ('pending','retry_wait')
  AND (d.next_retry_at IS NULL OR d.next_retry_at <= NOW())
ORDER BY o.fire_at ASC, d.id ASC
LIMIT 100;`;

const PLAN_JS = `const d = $input.item.json || {};
if (!d.id) return { json: { _skip: true } };
function normMobile(m) {
  let s = String(m || '').replace(/\\D/g, '');
  if (s.startsWith('98') && s.length === 12) s = '0' + s.slice(2);
  if (s.length === 10 && s.startsWith('9')) s = '0' + s;
  return s;
}
const title = d.tpl_title_fa || 'یادآوری';
const body = d.tpl_default_text || '';
const sms_template = d.tpl_sms_template || '';
const mobile = d.mobile || d.phone_number || null;
return {
  json: {
    delivery_id: d.id,
    occurrence_id: Number(d.occurrence_id) || 0,
    reminder_id: d.reminder_id,
    user_id: d.user_id,
    channel: d.channel,
    unit_cost: Number(d.unit_cost) || 0,
    title,
    body,
    sms_template,
    fcmToken: d.fcmToken || null,
    isnotif: Number(d.isnotif) || 0,
    mobile,
    mobile_norm: normMobile(mobile),
    bale_id: d.bale_id || null,
    attempt_no: Number(d.attempt_no) || 0,
    max_attempts: Number(d.max_attempts) || 5,
    idempotency_key: 'delivery:' + d.id + ':attempt:' + ((Number(d.attempt_no)||0) + 1)
  }
};
`;

const EXECUTE_JS = `const p = $input.item.json || {};
if (p._skip) return { json: p };
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

if ((channel === 'notification' || channel === 'sms') && mobileNorm !== TEST_MOBILE) {
  action = 'skip';
  error_code = 'TEST_ALLOWLIST';
  error = 'تست: فقط شماره مجاز';
} else if (channel === 'notification') {
  // ok
} else if (channel === 'sms') {
  if (!p.mobile) { action = 'skip'; error_code = 'NO_MOBILE'; error = 'شماره موبایل نیست'; }
  else if (!p.sms_template) { action = 'skip'; error_code = 'NO_SMS_TEMPLATE'; error = 'قالب پیامک یافت نشد'; }
} else if (channel === 'bale') {
  action = 'skip'; error_code = 'PROVIDER_NOT_CONFIGURED'; error = 'ارسال بله هنوز پیکربندی نشده';
} else {
  action = 'skip'; error_code = 'UNKNOWN_CHANNEL'; error = channel;
}

return { json: { ...p, action, error_code, error, needs_charge: action === 'send' && cost > 0 } };
`;

const WALLET_JS = `const plan = $('cron_dispatch_execute').item.json || {};
if (plan._skip) return { json: plan };
if (plan.action === 'skip') {
  return { json: { ...plan, do: 'skip', delivery_id: plan.delivery_id } };
}
if (!plan.needs_charge) {
  return { json: { ...plan, do: 'send', delivery_id: plan.delivery_id } };
}
return { json: { ...plan, do: 'charge_then_send', delivery_id: plan.delivery_id } };
`;

const AFTER_BAL_JS = `const plan = $('cron_dispatch_wallet_logic').item.json || {};
if (plan._skip) return { json: plan };
const balRow = $input.item.json || {};
const balance = Number(balRow.balance);
const cost = Number(plan.unit_cost) || 0;
if (plan.do === 'skip') {
  return { json: { ...plan, final_action: 'skip' } };
}
if (plan.do === 'send') {
  return { json: { ...plan, final_action: 'send', charged: 0 } };
}
if (!(balance >= cost)) {
  return { json: { ...plan, final_action: 'skip', error_code: 'INSUFFICIENT_BALANCE', error: 'موجودی کافی نیست', charged: 0 } };
}
return { json: { ...plan, final_action: 'debit_and_send', charged: 1, balance } };
`;

const ROUTE_JS = `const plan = $('cron_dispatch_after_balance').item.json || {};
if (plan._skip) return { json: plan };
let final_action = plan.final_action;
if (final_action === 'debit_and_send') final_action = 'send';
if (final_action === 'skip') {
  return { json: { ...plan, final_action: 'skip' } };
}
return { json: { ...plan, final_action: 'send' } };
`;

const FINISH_JS = `const plan = $('cron_dispatch_route_channel').item.json || {};
if (plan._skip) {
  return { json: { delivery_id: plan.delivery_id || 0, occurrence_id: plan.occurrence_id || 0, status: 'skipped', error_code: 'SKIP', error: null, channel: plan.channel || null } };
}
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
} else {
  status = 'sent';
}
return {
  json: {
    delivery_id: plan.delivery_id,
    occurrence_id: plan.occurrence_id,
    status,
    error_code,
    error,
    channel
  }
};
`;

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
  `reminders-dispatch-batch-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
console.log("backup", path.relative(process.cwd(), backupFile));

const nodes = wf.nodes || [];
const connections = wf.connections || {};
const byName = name => nodes.find(n => n.name === name);

function setEachItemCode(name, jsCode) {
  const node = byName(name);
  if (!node) throw new Error(`missing node ${name}`);
  node.parameters = {
    ...node.parameters,
    mode: "runOnceForEachItem",
    jsCode
  };
}

const claim = byName("cron_dispatch_claim");
const deliveries = byName("cron_dispatch_deliveries");
if (!claim || !deliveries) throw new Error("claim/deliveries missing");

claim.parameters = {
  ...claim.parameters,
  operation: "executeQuery",
  query: CLAIM_QUERY
};
// Ensure chain continues even when UPDATE affects 0 rows
claim.alwaysOutputData = true;

deliveries.parameters = {
  ...deliveries.parameters,
  operation: "executeQuery",
  query: DELIVERIES_QUERY,
  options: {} // no queryReplacement — loads all claimed-window deliveries
};
deliveries.alwaysOutputData = true;

setEachItemCode("cron_dispatch_plan", PLAN_JS);
setEachItemCode("cron_dispatch_execute", EXECUTE_JS);
setEachItemCode("cron_dispatch_wallet_logic", WALLET_JS);
setEachItemCode("cron_dispatch_after_balance", AFTER_BAL_JS);
setEachItemCode("cron_dispatch_route_channel", ROUTE_JS);
setEachItemCode("cron_dispatch_finish", FINISH_JS);

// claim → deliveries → plan (skip expand bottleneck)
connections.cron_dispatch_claim = {
  main: [[{ node: "cron_dispatch_deliveries", type: "main", index: 0 }]]
};
connections.cron_dispatch_deliveries = {
  main: [[{ node: "cron_dispatch_plan", type: "main", index: 0 }]]
};

// Cron path must not terminate into a webhook Respond node
if (connections.cron_dispatch_mark_done) {
  const mains = connections.cron_dispatch_mark_done.main || [];
  connections.cron_dispatch_mark_done.main = mains.map(branch =>
    (branch || []).filter(t => t.node !== "Respond to Webhook")
  );
  console.log("removed mark_done → Respond to Webhook");
}

wf.nodes = nodes;
wf.connections = connections;

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
console.log("patched: claim→all-deliveries + per-item pipeline");
console.log("unused expand node left in place (disconnected):", !!byName("cron_dispatch_expand"));
