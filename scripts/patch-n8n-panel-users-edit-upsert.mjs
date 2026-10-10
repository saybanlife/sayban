/**
 * Patch panel-user `/panel/users/edit` to UPSERT center_admin profiles.
 *
 * Credentials are always cloned from any existing MySQL node in the workflow
 * (MySQL42 may already be gone from a prior patch).
 *
 *   node scripts/patch-n8n-panel-users-edit-upsert.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_ID = "A9UoaMCH5ThcTbG5";
const WEBHOOK_NAME = "/panel/users/edit";
const OLD_MYSQL = "MySQL42";
const FORMAT_NAME = "Code33";
const RESPOND_NAME = "Respond to Webhook51";

const PREPARE = "users_edit_prepare";
const CRYPTO = "users_edit_crypto";
const LOOKUP = "users_edit_lookup";
const BRANCH = "users_edit_branch";
const UPDATE = "users_edit_update";
const INSERT = "users_edit_insert";
const AFTER_INSERT = "users_edit_after_insert";
const FAIL = "users_edit_fail";

const ADDED = [
  PREPARE,
  CRYPTO,
  LOOKUP,
  BRANCH,
  UPDATE,
  INSERT,
  AFTER_INSERT,
  FAIL,
  "users_edit_if_update",
  "users_edit_if_insert"
];

const PREPARE_JS = `const body = ($input.first().json.body) || {};
const id = Number(body.id) || 0;
const center_id = Number(body.center_id) || 0;
const name = String(body.name || body.full_name || '').trim();
const email = String(body.email || body.emaile || '').trim().toLowerCase();
const mobileRaw = String(body.mobile || body.phone || '').trim();
const mobileDigits = mobileRaw.replace(/\\D+/g, '');
const mobile = mobileDigits.startsWith('98') && mobileDigits.length === 12
  ? ('0' + mobileDigits.slice(2))
  : mobileDigits;
const password = String(body.password || body.password1 || '');
const ok = Boolean((id || center_id) && name && email);
return [{
  json: {
    ok,
    message: ok ? '' : 'نام، ایمیل و شناسه کاربر یا مرکز الزامی است.',
    id,
    center_id,
    name,
    email,
    mobile,
    password
  }
}];
`;

const BRANCH_JS = `const prep = $('${PREPARE}').first().json || {};
if (!prep.ok) {
  return [{ json: { success: false, message: prep.message, mode: 'fail' } }];
}
const rows = items.map(i => i.json).filter(r => r && r.id != null);
const existing = rows[0] || null;
const passwordHash = String(($('${CRYPTO}').first().json || {}).data || '');
if (existing) {
  return [{
    json: {
      mode: 'update',
      success: true,
      id: Number(existing.id),
      center_id: Number(existing.center_id || prep.center_id || 0),
      name: prep.name,
      email: prep.email,
      mobile: prep.mobile,
      password_hash: prep.password ? passwordHash : ''
    }
  }];
}
if (!prep.center_id) {
  return [{ json: { mode: 'fail', success: false, message: 'کاربر یافت نشد.' } }];
}
if (!prep.password || !passwordHash) {
  return [{
    json: {
      mode: 'fail',
      success: false,
      message: 'برای ایجاد حساب مرکز، رمز عبور الزامی است.'
    }
  }];
}
return [{
  json: {
    mode: 'insert',
    success: true,
    center_id: Number(prep.center_id),
    name: prep.name,
    email: prep.email,
    mobile: prep.mobile,
    password_hash: passwordHash
  }
}];
`;

const FAIL_JS = `const branch = items[0].json || {};
return [{ json: { success: false, message: branch.message || 'ذخیره پروفایل کاربر ناموفق بود.' } }];
`;

const FORMAT_JS = `const branch = $('${BRANCH}').first().json || {};
if (branch.mode === 'fail' || branch.success === false) {
  return [{ json: { success: false, message: branch.message || 'ذخیره پروفایل کاربر ناموفق بود.' } }];
}
let id = Number(branch.id) || 0;
let center_id = branch.center_id != null ? Number(branch.center_id) : null;
let name = branch.name;
let email = branch.email;
let mobile = branch.mobile;
let is_active = 1;
if (branch.mode === 'insert') {
  const insertOut = ($('${INSERT}').first().json) || {};
  const insertErr = String(insertOut.message || insertOut.error || insertOut.sqlMessage || '');
  if (/Duplicate|ER_DUP|unique/i.test(insertErr)) {
    return [{ json: { success: false, message: 'ایمیل یا شماره همراه قبلاً ثبت شده است.' } }];
  }
  if (insertErr && insertOut.id == null && insertOut.insertId == null) {
    return [{ json: { success: false, message: 'ذخیره پروفایل کاربر ناموفق بود.' } }];
  }
  const row = ($('${AFTER_INSERT}').first().json) || {};
  id = Number(row.id) || Number(insertOut.insertId) || 0;
  center_id = row.center_id != null ? Number(row.center_id) : center_id;
  name = row.name || row.full_name || name;
  email = row.email || email;
  mobile = row.mobile || mobile;
  is_active = row.is_active != null ? Number(row.is_active) : 1;
}
if (!id) {
  return [{ json: { success: false, message: 'ذخیره پروفایل کاربر ناموفق بود.' } }];
}
return [{
  json: {
    success: true,
    message: branch.mode === 'insert' ? 'پروفایل کاربر ایجاد شد.' : 'پروفایل کاربر به‌روزرسانی شد.',
    result: { id, center_id, name, email, mobile, is_active }
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
    `panel-user-users-edit-upsert-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`
  ),
  JSON.stringify(wf, null, 1),
  "utf8"
);

const nodes = JSON.parse(JSON.stringify(wf.nodes));
const connections = JSON.parse(JSON.stringify(wf.connections));

const webhook = nodes.find(n => n.name === WEBHOOK_NAME);
const oldMysql = nodes.find(n => n.name === OLD_MYSQL);
const anyMysql = nodes.find(
  n =>
    n.type === "n8n-nodes-base.mySql" &&
    n.credentials?.mySql?.id &&
    !ADDED.includes(n.name)
);
const format = nodes.find(n => n.name === FORMAT_NAME);
const respond = nodes.find(n => n.name === RESPOND_NAME);
if (!webhook || !format || !respond) {
  throw new Error("expected users/edit nodes missing");
}

const creds = JSON.parse(
  JSON.stringify(
    oldMysql?.credentials ||
      anyMysql?.credentials ||
      nodes.find(n => n.credentials?.mySql)?.credentials ||
      {}
  )
);
if (!creds.mySql?.id) {
  throw new Error("no MySQL credentials found in workflow to clone");
}

const typeVersion =
  oldMysql?.typeVersion || anyMysql?.typeVersion || 2.4;

for (const name of [...ADDED, OLD_MYSQL]) {
  const idx = nodes.findIndex(n => n.name === name);
  if (idx >= 0) nodes.splice(idx, 1);
  delete connections[name];
}

const [x, y] = webhook.position || [0, 0];

// Match this workflow's queryReplacement style: comma-separated expressions.
const qr = (...exprs) => `={{ ${exprs.join(" }},{{ ") } }}`;

nodes.push(
  {
    parameters: { jsCode: PREPARE_JS },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [x + 180, y],
    id: uuid(),
    name: PREPARE
  },
  {
    parameters: {
      action: "hmac",
      type: "SHA256",
      value: "={{ $json.password || 'x' }}",
      secret: "21232f297a57a5a743894a0e4a801fc3"
    },
    type: "n8n-nodes-base.crypto",
    typeVersion: 1,
    position: [x + 360, y],
    id: uuid(),
    name: CRYPTO
  },
  {
    parameters: {
      operation: "executeQuery",
      query: `SELECT id, center_id, full_name AS name, email, mobile, is_active
FROM panel__users
WHERE (NULLIF($1, 0) IS NOT NULL AND id = $1)
   OR (NULLIF($1, 0) IS NULL AND NULLIF($2, 0) IS NOT NULL AND center_id = $2 AND role = 'center_admin')
LIMIT 1;`,
      options: {
        queryReplacement: qr(
          "Number($('users_edit_prepare').item.json.id) || 0",
          "Number($('users_edit_prepare').item.json.center_id) || 0"
        )
      }
    },
    type: "n8n-nodes-base.mySql",
    typeVersion,
    position: [x + 540, y],
    id: uuid(),
    name: LOOKUP,
    credentials: creds,
    alwaysOutputData: true
  },
  {
    parameters: { jsCode: BRANCH_JS },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [x + 720, y],
    id: uuid(),
    name: BRANCH
  },
  {
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
            leftValue: "={{ $json.mode }}",
            rightValue: "update",
            operator: { type: "string", operation: "equals" }
          }
        ],
        combinator: "and"
      },
      options: {}
    },
    type: "n8n-nodes-base.if",
    typeVersion: 2,
    position: [x + 900, y - 80],
    id: uuid(),
    name: "users_edit_if_update"
  },
  {
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
            leftValue: "={{ $json.mode }}",
            rightValue: "insert",
            operator: { type: "string", operation: "equals" }
          }
        ],
        combinator: "and"
      },
      options: {}
    },
    type: "n8n-nodes-base.if",
    typeVersion: 2,
    position: [x + 900, y + 80],
    id: uuid(),
    name: "users_edit_if_insert"
  },
  {
    parameters: {
      operation: "executeQuery",
      query: `UPDATE panel__users
SET full_name = $2,
    email = $3,
    mobile = NULLIF($4, ''),
    password = IF(NULLIF($5, '') IS NULL, password, $5)
WHERE id = $1;`,
      options: {
        queryReplacement: qr(
          "Number($json.id)",
          "String($json.name || '')",
          "String($json.email || '')",
          "String($json.mobile || '')",
          "String($json.password_hash || '')"
        )
      }
    },
    type: "n8n-nodes-base.mySql",
    typeVersion,
    position: [x + 1120, y - 120],
    id: uuid(),
    name: UPDATE,
    credentials: creds,
    alwaysOutputData: true
  },
  {
    parameters: {
      operation: "executeQuery",
      query: `INSERT INTO panel__users (center_id, full_name, email, mobile, password, role, is_active)
VALUES ($1, $2, $3, NULLIF($4, ''), $5, 'center_admin', 1);`,
      options: {
        queryReplacement: qr(
          "Number($json.center_id)",
          "String($json.name || '')",
          "String($json.email || '')",
          "String($json.mobile || '')",
          "String($json.password_hash || '')"
        )
      }
    },
    type: "n8n-nodes-base.mySql",
    typeVersion,
    position: [x + 1120, y + 40],
    id: uuid(),
    name: INSERT,
    credentials: creds,
    alwaysOutputData: true,
    onError: "continueRegularOutput"
  },
  {
    parameters: {
      operation: "executeQuery",
      query: `SELECT id, center_id, full_name AS name, email, mobile, is_active
FROM panel__users
WHERE center_id = $1 AND role = 'center_admin'
ORDER BY id DESC
LIMIT 1;`,
      options: {
        queryReplacement:
          "={{ ($('users_edit_branch').item.json.center_id || 0).toString() }}"
      }
    },
    type: "n8n-nodes-base.mySql",
    typeVersion,
    position: [x + 1320, y + 40],
    id: uuid(),
    name: AFTER_INSERT,
    credentials: creds,
    alwaysOutputData: true,
    onError: "continueRegularOutput"
  },
  {
    parameters: { jsCode: FAIL_JS },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [x + 1120, y + 200],
    id: uuid(),
    name: FAIL
  }
);

format.parameters.jsCode = FORMAT_JS;

connections[WEBHOOK_NAME] = {
  main: [[{ node: PREPARE, type: "main", index: 0 }]]
};
connections[PREPARE] = {
  main: [[{ node: CRYPTO, type: "main", index: 0 }]]
};
connections[CRYPTO] = {
  main: [[{ node: LOOKUP, type: "main", index: 0 }]]
};
connections[LOOKUP] = {
  main: [[{ node: BRANCH, type: "main", index: 0 }]]
};
connections[BRANCH] = {
  main: [[{ node: "users_edit_if_update", type: "main", index: 0 }]]
};
connections["users_edit_if_update"] = {
  main: [
    [{ node: UPDATE, type: "main", index: 0 }],
    [{ node: "users_edit_if_insert", type: "main", index: 0 }]
  ]
};
connections["users_edit_if_insert"] = {
  main: [
    [{ node: INSERT, type: "main", index: 0 }],
    [{ node: FAIL, type: "main", index: 0 }]
  ]
};
connections[UPDATE] = {
  main: [[{ node: FORMAT_NAME, type: "main", index: 0 }]]
};
connections[INSERT] = {
  main: [[{ node: AFTER_INSERT, type: "main", index: 0 }]]
};
connections[AFTER_INSERT] = {
  main: [[{ node: FORMAT_NAME, type: "main", index: 0 }]]
};
connections[FAIL] = {
  main: [[{ node: RESPOND_NAME, type: "main", index: 0 }]]
};
connections[FORMAT_NAME] = {
  main: [[{ node: RESPOND_NAME, type: "main", index: 0 }]]
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

const verify = await fetch(`${base}/rest/workflows/${WORKFLOW_ID}`, {
  headers: { Cookie: cookie }
}).then(r => r.json());
const vnodes = (verify.data || verify).nodes || [];
for (const name of [LOOKUP, UPDATE, INSERT, AFTER_INSERT]) {
  const n = vnodes.find(x => x.name === name);
  if (!n?.credentials?.mySql?.id) {
    throw new Error(`post-patch missing credentials on ${name}`);
  }
}
console.log(
  "patched /panel/users/edit upsert; mysql cred id=",
  creds.mySql.id
);
