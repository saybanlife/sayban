/**
 * Two-phase self-serve center signup in n8n `panel users`:
 * 1) POST /panel/user/register — create pending center + admin → center_id
 * 2) POST /panel/user/register/complete — update complementary fields by center_id
 *
 *   node scripts/patch-n8n-center-register-two-phase.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_ID = "R3C05zC3WAHATL3X";
const MYSQL_CREDENTIALS = {
  mySql: { id: "oNRa6pdlbbcsx18m", name: "MySQL account" }
};

const PREPARE_JS = `const body = $('panel/user/register').first().json.body || {};
const email = String(body.email || body.emaile || '').trim();
const name = String(body.center_name || body.registered_center_name || '').trim();
if (!email || !name) {
  return [{ json: { ok: false, message: 'نام مرکز و ایمیل الزامی است.' } }];
}
return [{
  json: {
    ok: true,
    name,
    email,
    is_active: 0,
    approval_status: 'pending'
  }
}];
`;

const SUCCESS_JS = `const centerId = Number($('Code11').first().json.center_id) || null;
const userId = $('MySQL9').first().json.data?.insertId;
return [{
  json: {
    success: true,
    message: "مرکز ایجاد شد. اطلاعات تکمیلی را تکمیل کنید.",
    result: {
      id: userId,
      role: "center_admin",
      full_name: $('panel/user/register').first().json.body.center_name,
      center_id: centerId,
      pending: true,
      phase: "created",
      token: $input.first().json.token
    }
  }
}];
`;

const COMPLETE_AUTH_JS = `const input = items[0].json || {};
const body = input.body || {};
const center_id = Number(body.center_id) || 0;
const email = String(body.email || body.emaile || '').trim();
const password = String(body.password || '');
const careDomain = String(body.care_domain || '').trim();
const care_domain = ['elderly', 'nursing', 'both'].includes(careDomain) ? careDomain : null;
const name = String(body.center_name || body.registered_center_name || '').trim();
const phone = String(body.phone || body.mobile || '').trim();
const manager_last_name = String(body.manager_last_name || '').trim();
const registered_center_name = String(body.registered_center_name || name).trim();
const license_number = String(body.license_number || '').trim();
const establishment_notice = String(body.establishment_notice || '').trim();
const registration_docs = String(body.registration_docs || '').trim();
const ok = Boolean(center_id && email && password && care_domain && manager_last_name && name && phone && license_number && establishment_notice && registration_docs);
return [{
  json: {
    ok,
    message: ok ? '' : 'اطلاعات تکمیلی ثبت‌نام ناقص است.',
    center_id,
    email,
    password,
    care_domain,
    manager_last_name,
    registered_center_name,
    name,
    phone,
    license_number,
    establishment_notice,
    registration_docs
  }
}];
`;

const COMPLETE_GATE_JS = `const auth = $('register_complete_auth').first().json || {};
if (!auth.ok) {
  return [{ json: { success: false, message: auth.message || 'درخواست نامعتبر است.' } }];
}
const rows = items.map(i => i.json).filter(r => r && (r.id != null || r.center_id != null));
const row = rows[0];
if (!row) {
  return [{ json: { success: false, message: 'مرکز یا حساب کاربری یافت نشد.' } }];
}
return [{ json: { success: true, center_id: Number(auth.center_id), admin_id: Number(row.id) || null } }];
`;

const COMPLETE_DONE_JS = `const gate = $('register_complete_gate').first().json || {};
if (!gate.success) return [{ json: gate }];
return [{
  json: {
    success: true,
    message: "درخواست ثبت‌نام مرکز ثبت شد و در انتظار تأیید است.",
    result: {
      center_id: gate.center_id,
      pending: true,
      phase: "completed"
    }
  }
}];
`;

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

function col(column, value) {
  return { column, value };
}

function uuid() {
  return crypto.randomUUID();
}

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

const detail = await fetch(`${base}/rest/workflows/${WORKFLOW_ID}`, {
  headers: { Cookie: cookie }
}).then(r => r.json());
const wf = detail.data || detail;

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
fs.writeFileSync(
  path.join(
    backupDir,
    `panel-users-register-two-phase-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`
  ),
  JSON.stringify(wf, null, 1),
  "utf8"
);

const nodes = JSON.parse(JSON.stringify(wf.nodes));
const connections = JSON.parse(JSON.stringify(wf.connections));

const prepare = nodes.find(n => n.name === "register_fields");
const mysql6 = nodes.find(n => n.name === "MySQL6");
const mysql9 = nodes.find(n => n.name === "MySQL9");
const code5 = nodes.find(n => n.name === "Code5");
const crypto1 = nodes.find(n => n.name === "Crypto1");
const respondTpl = nodes.find(n => n.type === "n8n-nodes-base.respondToWebhook");
if (!prepare || !mysql6 || !mysql9 || !code5 || !crypto1) {
  throw new Error("expected register nodes missing");
}

prepare.parameters.jsCode = PREPARE_JS;
mysql6.parameters.valuesToSend = {
  values: [
    col("name", "={{ $json.name }}"),
    col("email", "={{ $json.email || undefined }}"),
    col("is_active", "={{ $json.is_active }}"),
    col("approval_status", "={{ $json.approval_status }}")
  ]
};
mysql9.parameters.valuesToSend.values = [
  col("center_id", "={{ $json.center_id }}"),
  col(
    "full_name",
    "={{ $('panel/user/register').item.json.body.center_name }}"
  ),
  col(
    "email",
    "={{ $('panel/user/register')?.item?.json?.body?.email || $('panel/user/register')?.item?.json?.body?.emaile || undefined}}"
  ),
  col("role", "center_admin"),
  col("password", "={{ $('Crypto1').item?.json?.data }}"),
  col("is_active", "0")
];
code5.parameters.jsCode = SUCCESS_JS;

const ADDED = [
  "panel/user/register/complete",
  "register_complete_auth",
  "register_complete_crypto",
  "register_complete_lookup",
  "register_complete_gate",
  "register_complete_update_center",
  "register_complete_update_admin",
  "register_complete_done",
  "register_complete_respond"
];

for (const name of ADDED) {
  const idx = nodes.findIndex(n => n.name === name);
  if (idx >= 0) nodes.splice(idx, 1);
  delete connections[name];
}

const baseX = (mysql6.position?.[0] ?? 600) + 100;
const baseY = (mysql6.position?.[1] ?? 0) + 420;

nodes.push(
  {
    parameters: {
      httpMethod: "POST",
      path: "panel/user/register/complete",
      responseMode: "responseNode",
      options: {}
    },
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position: [baseX - 900, baseY],
    id: uuid(),
    name: "panel/user/register/complete",
    webhookId: uuid()
  },
  {
    parameters: { jsCode: COMPLETE_AUTH_JS },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [baseX - 680, baseY],
    id: uuid(),
    name: "register_complete_auth"
  },
  {
    parameters: {
      action: "hmac",
      type: "SHA256",
      value: "={{ $json.password }}",
      secret: "21232f297a57a5a743894a0e4a801fc3"
    },
    type: "n8n-nodes-base.crypto",
    typeVersion: crypto1.typeVersion || 1,
    position: [baseX - 460, baseY],
    id: uuid(),
    name: "register_complete_crypto"
  },
  {
    parameters: {
      operation: "executeQuery",
      query:
        "SELECT id, center_id, email FROM panel__users WHERE center_id = $1 AND email = $2 AND password = $3 AND role = 'center_admin' AND is_active = 0 LIMIT 1;",
      options: {
        queryReplacement:
          "={{ (() => { const a = $('register_complete_auth').item.json; return [a.center_id, String(a.email ?? ''), String($json.data ?? '')]; })() }}"
      }
    },
    type: "n8n-nodes-base.mySql",
    typeVersion: 2.4,
    position: [baseX - 240, baseY],
    id: uuid(),
    name: "register_complete_lookup",
    credentials: MYSQL_CREDENTIALS,
    alwaysOutputData: true
  },
  {
    parameters: { jsCode: COMPLETE_GATE_JS },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [baseX - 20, baseY],
    id: uuid(),
    name: "register_complete_gate"
  },
  {
    parameters: {
      operation: "executeQuery",
      query: `UPDATE centers
SET name = $2,
    phone = $3,
    care_domain = $4,
    manager_last_name = $5,
    registered_center_name = $6,
    license_number = $7,
    establishment_notice = $8,
    registration_docs = $9,
    approval_status = 'pending',
    is_active = 0
WHERE id = $1
  AND approval_status = 'pending';`,
      options: {
        queryReplacement:
          "={{ (() => { const a = $('register_complete_auth').item.json; return [a.center_id, String(a.name ?? ''), String(a.phone ?? ''), String(a.care_domain ?? ''), String(a.manager_last_name ?? ''), String(a.registered_center_name ?? ''), String(a.license_number ?? ''), String(a.establishment_notice ?? ''), String(a.registration_docs ?? '')]; })() }}"
      }
    },
    type: "n8n-nodes-base.mySql",
    typeVersion: 2.4,
    position: [baseX + 200, baseY],
    id: uuid(),
    name: "register_complete_update_center",
    credentials: MYSQL_CREDENTIALS,
    alwaysOutputData: true,
    onError: "continueRegularOutput"
  },
  {
    parameters: {
      operation: "executeQuery",
      query: `UPDATE panel__users
SET full_name = $2,
    mobile = $3
WHERE center_id = $1
  AND role = 'center_admin';`,
      options: {
        queryReplacement:
          "={{ (() => { const a = $('register_complete_auth').item.json; return [a.center_id, String(a.manager_last_name ?? ''), String(a.phone ?? '')]; })() }}"
      }
    },
    type: "n8n-nodes-base.mySql",
    typeVersion: 2.4,
    position: [baseX + 420, baseY],
    id: uuid(),
    name: "register_complete_update_admin",
    credentials: MYSQL_CREDENTIALS,
    alwaysOutputData: true,
    onError: "continueRegularOutput"
  },
  {
    parameters: { jsCode: COMPLETE_DONE_JS },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [baseX + 640, baseY],
    id: uuid(),
    name: "register_complete_done"
  },
  {
    parameters: respondTpl?.parameters || { options: {} },
    type: "n8n-nodes-base.respondToWebhook",
    typeVersion: respondTpl?.typeVersion || 1.4,
    position: [baseX + 860, baseY],
    id: uuid(),
    name: "register_complete_respond"
  }
);

connections["panel/user/register/complete"] = {
  main: [[{ node: "register_complete_auth", type: "main", index: 0 }]]
};
connections["register_complete_auth"] = {
  main: [[{ node: "register_complete_crypto", type: "main", index: 0 }]]
};
connections["register_complete_crypto"] = {
  main: [[{ node: "register_complete_lookup", type: "main", index: 0 }]]
};
connections["register_complete_lookup"] = {
  main: [[{ node: "register_complete_gate", type: "main", index: 0 }]]
};
connections["register_complete_gate"] = {
  main: [[{ node: "register_complete_update_center", type: "main", index: 0 }]]
};
connections["register_complete_update_center"] = {
  main: [[{ node: "register_complete_update_admin", type: "main", index: 0 }]]
};
connections["register_complete_update_admin"] = {
  main: [[{ node: "register_complete_done", type: "main", index: 0 }]]
};
connections["register_complete_done"] = {
  main: [[{ node: "register_complete_respond", type: "main", index: 0 }]]
};

// Skip update path when gate failed (auth/lookup)
const gateIfName = "register_complete_gate_if";
{
  const idx = nodes.findIndex(n => n.name === gateIfName);
  if (idx >= 0) nodes.splice(idx, 1);
  delete connections[gateIfName];
}
nodes.push({
  parameters: {
    conditions: {
      options: {
        caseSensitive: true,
        leftValue: "",
        typeValidation: "strict",
        version: 2
      },
      conditions: [
        {
          id: uuid(),
          leftValue: "={{ $json.success }}",
          rightValue: true,
          operator: { type: "boolean", operation: "true", singleValue: true }
        }
      ],
      combinator: "and"
    },
    options: {}
  },
  type: "n8n-nodes-base.if",
  typeVersion: 2,
  position: [baseX + 90, baseY],
  id: uuid(),
  name: gateIfName
});
connections["register_complete_gate"] = {
  main: [[{ node: gateIfName, type: "main", index: 0 }]]
};
connections[gateIfName] = {
  main: [
    [{ node: "register_complete_update_center", type: "main", index: 0 }],
    [{ node: "register_complete_respond", type: "main", index: 0 }]
  ]
};

const patch = await fetch(`${base}/rest/workflows/${WORKFLOW_ID}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: wf.name,
    nodes,
    connections,
    settings: wf.settings || {},
    staticData: wf.staticData,
    active: true
  })
});
if (!patch.ok) throw new Error(`patch ${patch.status} ${await patch.text()}`);
console.log(
  "patched two-phase center register: create slim + /panel/user/register/complete"
);
