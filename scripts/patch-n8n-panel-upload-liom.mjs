/**
 * Wire panel `upload/image` to Liom multipart upload and persist URLs in
 * `panel__uploads`.
 *
 * Ensures HTTP Request posts multipart/form-data with:
 *   - binary field `data` → form field `file`
 *   - path=sayban
 *
 * Fixes the loop-done responder (was a leftover subcategories Code node) so
 * the webhook returns `{ success, result: [{ url }, ...] }` and inserts each
 * URL into `panel__uploads`.
 *
 *   node scripts/patch-n8n-panel-upload-liom.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_NAME = "panel2";
const WEBHOOK = "upload/image";
const LOOP = "Loop Over Items1";
const BINARY = "Base64 → Binary1";
const UPLOAD = "Upload to API1";
const COLLECT = "Collect Results";
const DONE_CODE = "Code3";
const RESPOND = "Respond to Webhook4";
const SAVE_ROW = "panel_upload_save_row";
const INSERT = "panel_upload_insert";
const FORMAT = "panel_upload_format";
const TEMPLATE_SQL = "MySQL6";

const LIOM_URL = "https://api.liom.app/upload/panel";

const ORIGINAL_COLLECT = `// همه urlها رو جمع می‌کنیم
const results = [];

// تمام آیتم‌های قبلی Loop رو نگاه می‌کنیم
for (const item of $("Upload to API1").all()) {
  if (item.json?.result) {           // فرض می‌کنیم API شما { result: "https://..." } برمی‌گردونه
    results.push(item.json.result);
  }
}

// اگر می‌خوای ساختار خاصی داشته باشی (مثلاً با main و order)
const firstItem = $("Loop Over Items1").first().json.img || {};

// برگردون به صورت آرایه (n8n این فرمت رو بهتر مدیریت می‌کنه)
return results.map((url, index) => ({
  json: {
    url: url,
    index: index,
    // اگر لازم داری اینا رو هم اضافه کن
    main: firstItem.main || false,
    order: firstItem.order
  }
}));`;

const ORIGINAL_DONE = `const output = [];

for (const item of items) {
    const data = { ...item.json };

    // تبدیل رشته JSON به آرایه واقعی
    if (typeof data.subcategories === 'string') {
        try {
            data.subcategories = JSON.parse(data.subcategories);
        } catch (e) {
            data.subcategories = [];
        }
    }

    output.push(data);
}

// خروجی فقط یک آیتم با یک فیلد "result"
return [
    {
        json: {
            success:true,
            result: output
        }
    }
];   `;

const SAVE_ROW_JS = `const res = $input.first().json || {};
const url =
  typeof res.result === "string"
    ? res.result
    : typeof res.url === "string"
      ? res.url
      : "";
const loopItem = $("${LOOP}").item?.json || $("${LOOP}").first().json || {};
const img = loopItem.img || {};
const webhook = $("${WEBHOOK}").first().json || {};
const auth = String(webhook.headers?.authorization || "");
const raw = auth.replace(/^Bearer\\s+/i, "").trim();
let claims = {};
try {
  const part = (raw.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
  claims = JSON.parse(Buffer.from(part, "base64").toString("utf8")) || {};
} catch (e) {
  claims = {};
}
if (!url) return [];
return [
  {
    json: {
      url,
      path: "sayban",
      original_name: String(img.name || "image.jpg"),
      mime_type: String(img.type || "image/jpeg"),
      uploaded_by: Number(claims.id) || 0,
      center_id: Number(claims.center) || 0,
      ok: true
    }
  }
];
`;

const FORMAT_JS = `const rows = $("${SAVE_ROW}").all()
  .map(item => item.json)
  .filter(row => row && row.ok && row.url);
const result = rows.map(row => ({ url: row.url }));
return [
  {
    json: {
      success: result.length > 0,
      result,
      message: result.length > 0 ? "آپلود موفق بود." : "آپلود ناموفق بود."
    }
  }
];
`;

const INSERT_SQL = `INSERT INTO panel__uploads
  (url, path, original_name, mime_type, uploaded_by, center_id, created_at)
VALUES
  (
    $1,
    $2,
    $3,
    $4,
    NULLIF($5, 0),
    NULLIF($6, 0),
    NOW()
  );`;

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

function uid() {
  return crypto.randomBytes(8).toString("hex");
}

const revert = process.argv.includes("--revert");
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
const summary = (list.data || []).find(w => w.name === WORKFLOW_NAME);
if (!summary) throw new Error(`workflow ${WORKFLOW_NAME} not found`);

const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const wf = detail.data || detail;

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
fs.writeFileSync(
  path.join(
    backupDir,
    `panel2-upload-liom-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  ),
  JSON.stringify(wf, null, 1),
  "utf8"
);

const byName = Object.fromEntries(wf.nodes.map(n => [n.name, n]));
const uploadNode = byName[UPLOAD];
const collect = byName[COLLECT];
const done = byName[DONE_CODE];
const respond = byName[RESPOND];
const templateSql = byName[TEMPLATE_SQL];
const loop = byName[LOOP];
if (!uploadNode || !collect || !done || !respond || !templateSql || !loop) {
  throw new Error("upload/image chain nodes missing");
}

if (revert) {
  uploadNode.parameters = {
    method: "POST",
    url: LIOM_URL,
    sendBody: true,
    contentType: "multipart-form-data",
    bodyParameters: {
      parameters: [
        {
          parameterType: "formBinaryData",
          name: "file",
          inputDataFieldName: "data"
        },
        { name: "path", value: "sayban" }
      ]
    },
    options: {}
  };
  collect.parameters = { jsCode: ORIGINAL_COLLECT };
  done.parameters = { jsCode: ORIGINAL_DONE };
  respond.parameters = { options: {} };
  wf.nodes = wf.nodes.filter(
    n => ![SAVE_ROW, INSERT, FORMAT].includes(n.name)
  );
  wf.connections[UPLOAD] = {
    main: [[{ node: COLLECT, type: "main", index: 0 }]]
  };
  wf.connections[COLLECT] = {
    main: [[{ node: LOOP, type: "main", index: 0 }]]
  };
  wf.connections[LOOP] = {
    main: [
      [{ node: DONE_CODE, type: "main", index: 0 }],
      [{ node: BINARY, type: "main", index: 0 }]
    ]
  };
  wf.connections[DONE_CODE] = {
    main: [[{ node: RESPOND, type: "main", index: 0 }]]
  };
  delete wf.connections[SAVE_ROW];
  delete wf.connections[INSERT];
  delete wf.connections[FORMAT];
} else {
  uploadNode.parameters = {
    method: "POST",
    url: LIOM_URL,
    sendBody: true,
    contentType: "multipart-form-data",
    bodyParameters: {
      parameters: [
        {
          parameterType: "formBinaryData",
          name: "file",
          inputDataFieldName: "data"
        },
        { name: "path", value: "sayban" }
      ]
    },
    options: {}
  };

  let saveRow = byName[SAVE_ROW];
  if (!saveRow) {
    saveRow = {
      id: uid(),
      name: SAVE_ROW,
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [
        (uploadNode.position?.[0] || 0) + 220,
        uploadNode.position?.[1] || 0
      ],
      parameters: {}
    };
    wf.nodes.push(saveRow);
  }
  saveRow.parameters = { jsCode: SAVE_ROW_JS };

  let insert = byName[INSERT];
  if (!insert) {
    insert = {
      id: uid(),
      name: INSERT,
      type: templateSql.type,
      typeVersion: templateSql.typeVersion || 2.4,
      position: [
        (saveRow.position?.[0] || 0) + 220,
        saveRow.position?.[1] || 0
      ],
      parameters: {},
      credentials: templateSql.credentials
    };
    wf.nodes.push(insert);
  }
  insert.parameters = {
    operation: "executeQuery",
    query: INSERT_SQL,
    options: {
      queryReplacement:
        "={{ [$json.url, $json.path, $json.original_name, $json.mime_type, $json.uploaded_by, $json.center_id] }}"
    }
  };
  insert.credentials = templateSql.credentials;

  let format = byName[FORMAT];
  if (!format) {
    format = {
      id: uid(),
      name: FORMAT,
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [
        (done.position?.[0] || 0),
        (done.position?.[1] || 0) + 40
      ],
      parameters: {}
    };
    wf.nodes.push(format);
  }
  format.parameters = { jsCode: FORMAT_JS };

  // Keep Collect Results around but unused; loop done uses FORMAT.
  collect.parameters = { jsCode: ORIGINAL_COLLECT };
  done.parameters = { jsCode: ORIGINAL_DONE };

  respond.parameters = {
    respondWith: "json",
    responseBody: "={{ JSON.stringify($json) }}",
    options: {}
  };

  // Upload → save row → insert → back to loop
  wf.connections[UPLOAD] = {
    main: [[{ node: SAVE_ROW, type: "main", index: 0 }]]
  };
  wf.connections[SAVE_ROW] = {
    main: [[{ node: INSERT, type: "main", index: 0 }]]
  };
  wf.connections[INSERT] = {
    main: [[{ node: LOOP, type: "main", index: 0 }]]
  };
  // Loop: done → format → respond; batch → binary → upload
  wf.connections[LOOP] = {
    main: [
      [{ node: FORMAT, type: "main", index: 0 }],
      [{ node: BINARY, type: "main", index: 0 }]
    ]
  };
  wf.connections[FORMAT] = {
    main: [[{ node: RESPOND, type: "main", index: 0 }]]
  };
  // Detach old Collect / Code3 from the happy path
  delete wf.connections[COLLECT];
  delete wf.connections[DONE_CODE];
}

const patchRes = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings || {}
  })
});
if (!patchRes.ok) {
  throw new Error(`patch failed: ${patchRes.status} ${await patchRes.text()}`);
}
console.log(
  revert
    ? "reverted panel upload/image Liom + panel__uploads wiring"
    : "panel upload/image → Liom multipart + panel__uploads insert OK"
);
