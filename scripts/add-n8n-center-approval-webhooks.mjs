/**
 * Adds Super Admin webhooks for reviewing self-serve center signups:
 *   GET  panel/center/registration?id=
 *   POST panel/center/approval { center_id, approval_status: approved|rejected }
 *
 * Approval also flips centers.is_active and the center_admin panel__users row
 * so list «وضعیت حساب» and login stay in sync.
 *
 *   node scripts/add-n8n-center-approval-webhooks.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_NAME = "panel2";
const TEMPLATE_SQL_NODE = "MySQL70";
const TEMPLATE_WEBHOOK_NODE = "/panel/users/edit2";
const TEMPLATE_CODE_NODE = "Code38";
const TEMPLATE_RESPOND_NODE = "Respond to Webhook57";

const REG_WEBHOOK = "center registration get";
const REG_SQL = "center_registration_read";
const REG_FORMAT = "center_registration_format";
const REG_RESPOND = "center_registration_respond";

const APPR_WEBHOOK = "center approval";
const APPR_PREP = "center_approval_prepare";
const APPR_CENTER = "center_approval_update_center";
const APPR_USER = "center_approval_update_user";
const APPR_READ = "center_approval_read";
const APPR_FORMAT = "center_approval_format";
const APPR_RESPOND = "center_approval_respond";

const ADDED_NODES = [
  REG_WEBHOOK,
  REG_SQL,
  REG_FORMAT,
  REG_RESPOND,
  APPR_WEBHOOK,
  APPR_PREP,
  APPR_CENTER,
  APPR_USER,
  APPR_READ,
  APPR_FORMAT,
  APPR_RESPOND
];

const REGISTRATION_SQL = `SELECT
  c.id,
  c.name,
  c.phone,
  c.address,
  c.city,
  c.state,
  c.care_domain,
  c.manager_last_name,
  c.registered_center_name,
  c.establishment_notice,
  c.license_number,
  c.registration_docs,
  c.main_image,
  c.banner_image,
  c.approval_status,
  c.is_active,
  c.created_at,
  pu.id AS account_id,
  pu.is_active AS account_is_active,
  pu.email AS account_email,
  (
    SELECT GROUP_CONCAT(ci.image_url ORDER BY ci.id SEPARATOR '||')
    FROM centers__images ci
    WHERE ci.center_id = c.id
  ) AS images_joined
FROM centers c
LEFT JOIN panel__users pu ON pu.id = (
  SELECT pu2.id FROM panel__users pu2
  WHERE pu2.center_id = c.id AND pu2.role = 'center_admin'
  ORDER BY pu2.id ASC LIMIT 1
)
WHERE c.deleted_at IS NULL AND c.id = $1
LIMIT 1;`;

const FORMAT_ROW_JS = `function toResult(row) {
  if (!row || !row.id) {
    return { success: false, message: "مرکز یافت نشد.", result: null };
  }
  const images = String(row.images_joined || '')
    .split('||')
    .map(s => s.trim())
    .filter(Boolean);
  const { images_joined, ...rest } = row;
  return {
    success: true,
    result: {
      ...rest,
      images,
      email: rest.account_email || ''
    }
  };
}
`;

const FORMAT_JS = `${FORMAT_ROW_JS}
const row = items[0]?.json || null;
return [{ json: toResult(row) }];
`;

const APPR_PREP_JS = `const body = $('${APPR_WEBHOOK}').first().json.body || {};
const centerId = Number(body.center_id);
const status = String(body.approval_status || '').trim().toLowerCase();
if (!centerId || !['approved', 'rejected'].includes(status)) {
  return [{
    json: {
      ok: false,
      message: 'center_id و approval_status (approved|rejected) الزامی است.',
      center_id: 0,
      approval_status: 'rejected',
      is_active: 0
    }
  }];
}
return [{
  json: {
    ok: true,
    center_id: centerId,
    approval_status: status,
    is_active: status === 'approved' ? 1 : 0
  }
}];
`;

const APPR_CENTER_SQL = `UPDATE centers
SET approval_status = $1,
    is_active = $2
WHERE id = $3 AND deleted_at IS NULL;`;

const APPR_USER_SQL = `UPDATE panel__users
SET is_active = $1
WHERE center_id = $2 AND role = 'center_admin';`;

const APPR_FORMAT_JS = `${FORMAT_ROW_JS}
const prep = $('${APPR_PREP}').first().json || {};
if (!prep.ok) {
  return [{ json: { success: false, message: prep.message || 'درخواست نامعتبر', result: null } }];
}
const row = items[0]?.json || null;
const payload = toResult(row);
if (!payload.success) return [{ json: payload }];
payload.message = prep.approval_status === 'approved'
  ? 'مرکز تأیید شد و حساب کاربری فعال گردید.'
  : 'درخواست ثبت‌نام مرکز رد شد.';
return [{ json: payload }];
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
}).then(r => r.json());
const summary = (list.data || []).find(w => w.name === WORKFLOW_NAME);
if (!summary) throw new Error(`workflow ${WORKFLOW_NAME} not found`);

const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const wf = detail.data || detail;

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(
  backupDir,
  `${WORKFLOW_NAME}-approval-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
console.log(`backup written: ${path.relative(process.cwd(), backupFile)}`);

let nodes = [...wf.nodes];
const connections = JSON.parse(JSON.stringify(wf.connections));

if (revert) {
  nodes = nodes.filter(n => !ADDED_NODES.includes(n.name));
  for (const name of ADDED_NODES) delete connections[name];
} else {
  // Drop any previous partial install (older node names / broken image branch).
  const stale = [
    ...ADDED_NODES,
    "center_registration_images",
    "center_approval_images"
  ];
  nodes = nodes.filter(n => !stale.includes(n.name));
  for (const name of stale) delete connections[name];

  const sqlTemplate = nodes.find(n => n.name === TEMPLATE_SQL_NODE);
  const webhookTemplate = nodes.find(n => n.name === TEMPLATE_WEBHOOK_NODE);
  const codeTemplate = nodes.find(n => n.name === TEMPLATE_CODE_NODE);
  const respondTemplate = nodes.find(n => n.name === TEMPLATE_RESPOND_NODE);
  for (const [label, node] of [
    [TEMPLATE_SQL_NODE, sqlTemplate],
    [TEMPLATE_WEBHOOK_NODE, webhookTemplate],
    [TEMPLATE_CODE_NODE, codeTemplate],
    [TEMPLATE_RESPOND_NODE, respondTemplate]
  ]) {
    if (!node) throw new Error(`template node ${label} not found`);
  }

  const x = (webhookTemplate.position?.[0] ?? 0) - 200;
  const y = (webhookTemplate.position?.[1] ?? 0) + 520;

  const wire = (from, to) => {
    connections[from] = { main: [[{ node: to, type: "main", index: 0 }]] };
  };

  nodes.push(
    {
      parameters: {
        httpMethod: "GET",
        path: "panel/center/registration",
        responseMode: "responseNode",
        options: {}
      },
      type: "n8n-nodes-base.webhook",
      typeVersion: webhookTemplate.typeVersion,
      position: [x, y],
      id: crypto.randomUUID(),
      name: REG_WEBHOOK,
      webhookId: crypto.randomUUID()
    },
    {
      parameters: {
        operation: "executeQuery",
        query: REGISTRATION_SQL,
        options: {
          queryReplacement: `={{ ($json.query.id || $json.query.center_id || '').toString() }}`
        }
      },
      type: "n8n-nodes-base.mySql",
      typeVersion: sqlTemplate.typeVersion,
      position: [x + 220, y],
      id: crypto.randomUUID(),
      name: REG_SQL,
      credentials: JSON.parse(JSON.stringify(sqlTemplate.credentials || {}))
    },
    {
      parameters: { jsCode: FORMAT_JS },
      type: "n8n-nodes-base.code",
      typeVersion: codeTemplate.typeVersion,
      position: [x + 440, y],
      id: crypto.randomUUID(),
      name: REG_FORMAT
    },
    {
      parameters: { options: {} },
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: respondTemplate.typeVersion,
      position: [x + 660, y],
      id: crypto.randomUUID(),
      name: REG_RESPOND
    },
    {
      parameters: {
        httpMethod: "POST",
        path: "panel/center/approval",
        responseMode: "responseNode",
        options: {}
      },
      type: "n8n-nodes-base.webhook",
      typeVersion: webhookTemplate.typeVersion,
      position: [x, y + 280],
      id: crypto.randomUUID(),
      name: APPR_WEBHOOK,
      webhookId: crypto.randomUUID()
    },
    {
      parameters: { jsCode: APPR_PREP_JS },
      type: "n8n-nodes-base.code",
      typeVersion: codeTemplate.typeVersion,
      position: [x + 220, y + 280],
      id: crypto.randomUUID(),
      name: APPR_PREP
    },
    {
      parameters: {
        operation: "executeQuery",
        query: APPR_CENTER_SQL,
        options: {
          queryReplacement:
            "={{ $json.approval_status }},{{ $json.is_active }},{{ $json.center_id }}"
        }
      },
      type: "n8n-nodes-base.mySql",
      typeVersion: sqlTemplate.typeVersion,
      position: [x + 440, y + 280],
      id: crypto.randomUUID(),
      name: APPR_CENTER,
      credentials: JSON.parse(JSON.stringify(sqlTemplate.credentials || {}))
    },
    {
      parameters: {
        operation: "executeQuery",
        query: APPR_USER_SQL,
        options: {
          queryReplacement: `={{ $('${APPR_PREP}').item.json.is_active }},{{ $('${APPR_PREP}').item.json.center_id }}`
        }
      },
      type: "n8n-nodes-base.mySql",
      typeVersion: sqlTemplate.typeVersion,
      position: [x + 660, y + 280],
      id: crypto.randomUUID(),
      name: APPR_USER,
      credentials: JSON.parse(JSON.stringify(sqlTemplate.credentials || {}))
    },
    {
      parameters: {
        operation: "executeQuery",
        query: REGISTRATION_SQL,
        options: {
          queryReplacement: `={{ $('${APPR_PREP}').item.json.center_id.toString() }}`
        }
      },
      type: "n8n-nodes-base.mySql",
      typeVersion: sqlTemplate.typeVersion,
      position: [x + 880, y + 280],
      id: crypto.randomUUID(),
      name: APPR_READ,
      credentials: JSON.parse(JSON.stringify(sqlTemplate.credentials || {}))
    },
    {
      parameters: { jsCode: APPR_FORMAT_JS },
      type: "n8n-nodes-base.code",
      typeVersion: codeTemplate.typeVersion,
      position: [x + 1100, y + 280],
      id: crypto.randomUUID(),
      name: APPR_FORMAT
    },
    {
      parameters: { options: {} },
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: respondTemplate.typeVersion,
      position: [x + 1320, y + 280],
      id: crypto.randomUUID(),
      name: APPR_RESPOND
    }
  );

  wire(REG_WEBHOOK, REG_SQL);
  wire(REG_SQL, REG_FORMAT);
  wire(REG_FORMAT, REG_RESPOND);

  wire(APPR_WEBHOOK, APPR_PREP);
  wire(APPR_PREP, APPR_CENTER);
  wire(APPR_CENTER, APPR_USER);
  wire(APPR_USER, APPR_READ);
  wire(APPR_READ, APPR_FORMAT);
  wire(APPR_FORMAT, APPR_RESPOND);
}

const patchRes = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: wf.name,
    nodes,
    connections,
    settings: wf.settings || {}
  })
});
if (!patchRes.ok) {
  throw new Error(`patch failed: ${patchRes.status} ${await patchRes.text()}`);
}

const activateRes = await fetch(
  `${base}/rest/workflows/${summary.id}/activate`,
  {
    method: "POST",
    headers: { Cookie: cookie, Accept: "application/json" }
  }
);
console.log(
  activateRes.ok
    ? "workflow patched + activated"
    : `patched but activate failed: ${activateRes.status}`
);
