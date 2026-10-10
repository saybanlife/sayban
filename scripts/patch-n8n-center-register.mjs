/**
 * Patches the n8n `panel users` workflow so self-serve `/panel/user/register`
 * stores the two-step signup payload and leaves the center pending approval.
 *
 *   node scripts/patch-n8n-center-register.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_NAME = "panel users";
const PREPARE_NODE = "register_fields";
const INSERT_NODE = "MySQL6";
const USER_NODE = "MySQL9";
const SUCCESS_NODE = "Code5";
const INACTIVE_NODE = "Account Inactive Error";
const BRANCH_NODE = "If5";

const PREPARE_JS = `const body = $('panel/user/register').first().json.body || {};
const email = String(body.email || body.emaile || '').trim();
const name = String(body.center_name || body.registered_center_name || '').trim();
const careDomain = String(body.care_domain || '').trim();

return [{
  json: {
    name,
    phone: String(body.phone || body.mobile || '').trim(),
    email,
    care_domain: ['elderly', 'nursing', 'both'].includes(careDomain) ? careDomain : null,
    manager_last_name: String(body.manager_last_name || '').trim(),
    registered_center_name: String(body.registered_center_name || name).trim(),
    license_number: String(body.license_number || '').trim(),
    establishment_notice: String(body.establishment_notice || '').trim(),
    registration_docs: String(body.registration_docs || '').trim(),
    is_active: 0,
    approval_status: 'pending'
  }
}];
`;

const SUCCESS_JS = `const userId = $('MySQL9').first().json.data.insertId;

return [
    {
        json: {
            success: true,
            message: "درخواست ثبت‌نام مرکز ثبت شد و در انتظار تأیید است.",
            result: {
                id: userId,
                role: "center_admin",
                full_name: $('panel/user/register').first().json.body.center_name,
                center_id: $('Code11').first().json.center_id || 'null',
                pending: true,
                token: $input.first().json.token
            }
        }
    }
];
`;

const INACTIVE_JS = `
return [
  {
        json: {
            success: false,
            message: "حساب شما در انتظار تأیید است یا هنوز فعال نشده."
            }
  }
];
`;

const ORIGINAL_SUCCESS_JS = `
const userId = $('MySQL9').first().json.data.insertId;

return [
    {
        json: {
            success: true,
            result: {
                id:userId,
                role: "center_admin",
                full_name: $('panel/user/register').first().json.body.center_name,
                center_id: $('Code11').first().json.center_id || 'null',
                token: $input.first().json.token
            }
        }
    }
];
`;

const ORIGINAL_INACTIVE_JS = `
return [
  {
        json: {
            success: false,
            message: "حساب کاربری شما غیرفعال است"
            }
  }
];
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
  `${WORKFLOW_NAME.replace(/\s+/g, "-")}-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
console.log(`backup written: ${path.relative(process.cwd(), backupFile)}`);

let nodes = [...wf.nodes];
const connections = JSON.parse(JSON.stringify(wf.connections));

const mysql6 = nodes.find(n => n.name === INSERT_NODE);
const mysql9 = nodes.find(n => n.name === USER_NODE);
const code5 = nodes.find(n => n.name === SUCCESS_NODE);
const inactive = nodes.find(n => n.name === INACTIVE_NODE);
const if5 = nodes.find(n => n.name === BRANCH_NODE);
const codeTemplate = nodes.find(n => n.name === "Code11");
if (!mysql6 || !mysql9 || !code5 || !inactive || !if5 || !codeTemplate) {
  throw new Error("expected register nodes were not found");
}

if (revert) {
  nodes = nodes.filter(n => n.name !== PREPARE_NODE);
  delete connections[PREPARE_NODE];
  connections[BRANCH_NODE] = {
    main: [
      [{ node: INSERT_NODE, type: "main", index: 0 }],
      [{ node: "Code11", type: "main", index: 0 }]
    ]
  };
  mysql6.parameters.valuesToSend = {
    values: [col("name", "={{ $json.body.center_name }}")]
  };
  mysql9.parameters.valuesToSend.values = [
    col("center_id", "={{ $json.center_id }}"),
    col(
      "full_name",
      "={{ $('panel/user/register').item.json.body.center_name }}"
    ),
    col(
      "mobile",
      "={{ $('panel/user/register')?.item?.json?.body?.mobile || undefined}}"
    ),
    col(
      "email",
      "={{ $('panel/user/register')?.item?.json?.body?.emaile || undefined}}"
    ),
    col("role", "center_admin"),
    col("password", "={{ $('Crypto1').item?.json?.data }}"),
    col("is_active", "0")
  ];
  code5.parameters.jsCode = ORIGINAL_SUCCESS_JS;
  inactive.parameters.jsCode = ORIGINAL_INACTIVE_JS;
} else {
  mysql6.parameters.valuesToSend = {
    values: [
      col("name", "={{ $json.name }}"),
      col("phone", "={{ $json.phone || undefined }}"),
      col("email", "={{ $json.email || undefined }}"),
      col("care_domain", "={{ $json.care_domain || undefined }}"),
      col("manager_last_name", "={{ $json.manager_last_name || undefined }}"),
      col(
        "registered_center_name",
        "={{ $json.registered_center_name || undefined }}"
      ),
      col("license_number", "={{ $json.license_number || undefined }}"),
      col(
        "establishment_notice",
        "={{ $json.establishment_notice || undefined }}"
      ),
      col("registration_docs", "={{ $json.registration_docs || undefined }}"),
      col("is_active", "={{ $json.is_active }}"),
      col("approval_status", "={{ $json.approval_status }}")
    ]
  };

  mysql9.parameters.valuesToSend.values = [
    col("center_id", "={{ $json.center_id }}"),
    col(
      "full_name",
      "={{ $('panel/user/register').item.json.body.manager_last_name || $('panel/user/register').item.json.body.center_name }}"
    ),
    col(
      "mobile",
      "={{ $('panel/user/register')?.item?.json?.body?.mobile || $('panel/user/register')?.item?.json?.body?.phone || undefined}}"
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
  inactive.parameters.jsCode = INACTIVE_JS;

  if (!nodes.some(n => n.name === PREPARE_NODE)) {
    const x = (mysql6.position?.[0] ?? 0) - 220;
    const y = mysql6.position?.[1] ?? 0;
    nodes.push({
      parameters: { jsCode: PREPARE_JS },
      type: "n8n-nodes-base.code",
      typeVersion: codeTemplate.typeVersion,
      position: [x, y],
      id: crypto.randomUUID(),
      name: PREPARE_NODE
    });
  } else {
    const prepare = nodes.find(n => n.name === PREPARE_NODE);
    prepare.parameters.jsCode = PREPARE_JS;
  }

  connections[BRANCH_NODE] = {
    main: [
      [{ node: PREPARE_NODE, type: "main", index: 0 }],
      [{ node: "Code11", type: "main", index: 0 }]
    ]
  };
  connections[PREPARE_NODE] = {
    main: [[{ node: INSERT_NODE, type: "main", index: 0 }]]
  };
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

console.log(revert ? "reverted center register workflow" : "patched POST panel/user/register");
