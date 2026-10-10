/**
 * Panel uploads: browser → Liom; n8n only stores URLs.
 *
 * - Adds POST /panel/uploads (URL → panel__uploads)
 * - Rewrites upload/image to accept URLs only (rejects base64/file contents)
 * - Rewrites panel/update/image to pass through URLs (no file proxy)
 * - Slider add/update: use body.image_url when no image[] payload
 *
 *   node scripts/patch-n8n-panel-uploads-direct-liom.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const PANEL2 = "panel2";
const SLIDER = "Slider";

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

function backup(wf, label) {
  const dir = path.join(process.cwd(), "scripts", "backup");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(
      dir,
      `${label}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    ),
    JSON.stringify(wf, null, 1),
    "utf8"
  );
}

async function login(base, env) {
  const loginRes = await fetch(`${base}/rest/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      emailOrLdapLoginId: env.N8N_USER,
      password: env.N8N_PASSWORD
    })
  });
  if (!loginRes.ok) throw new Error(`n8n login failed: ${loginRes.status}`);
  return (loginRes.headers.get("set-cookie") || "").split(";")[0];
}

async function loadWorkflow(base, cookie, name) {
  const list = await fetch(`${base}/rest/workflows?limit=250`, {
    headers: { Cookie: cookie, Accept: "application/json" }
  }).then(r => r.json());
  const summary = (list.data || []).find(w => w.name === name);
  if (!summary) throw new Error(`workflow ${name} not found`);
  const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
    headers: { Cookie: cookie, Accept: "application/json" }
  }).then(r => r.json());
  return { id: summary.id, wf: detail.data || detail };
}

async function saveWorkflow(base, cookie, id, wf) {
  const patchRes = await fetch(`${base}/rest/workflows/${id}`, {
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
    throw new Error(
      `patch ${wf.name} failed: ${patchRes.status} ${await patchRes.text()}`
    );
  }
}

const REGISTER_PARSE_JS = `const body = $input.first().json.body || $input.first().json || {};
const auth = String(($input.first().json.headers || {}).authorization || "");
const raw = auth.replace(/^Bearer\\s+/i, "").trim();
let claims = {};
try {
  const part = (raw.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
  claims = JSON.parse(Buffer.from(part, "base64").toString("utf8")) || {};
} catch (e) {
  claims = {};
}
const url = String(body.url || "").trim();
const allowed =
  /^https:\\/\\//i.test(url) &&
  (/poshtiban\\.com\\//i.test(url) || /liom\\.app\\//i.test(url) || /lioms3\\//i.test(url));
if (!allowed) {
  return [{ json: { ok: false, message: "آدرس تصویر معتبر نیست." } }];
}
return [{
  json: {
    ok: true,
    url,
    path: String(body.path || "sayban").slice(0, 64),
    original_name: body.original_name ? String(body.original_name).slice(0, 255) : null,
    mime_type: body.mime_type ? String(body.mime_type).slice(0, 128) : null,
    uploaded_by: Number(claims.id) || 0,
    center_id: Number(claims.center || body.center_id) || 0
  }
}];
`;

const REGISTER_FORMAT_JS = `const parsed = $("panel_uploads_parse").first().json || {};
if (!parsed.ok) {
  return [{ json: { success: false, message: parsed.message || "ثبت ناموفق بود." } }];
}
return [{ json: { success: true, result: { url: parsed.url }, message: "ثبت شد." } }];
`;

const UPLOAD_IMAGE_URL_ONLY_JS = `const body = $input.first().json.body || {};
const raw = Array.isArray(body.image) ? body.image : Array.isArray(body.urls) ? body.urls : body.url ? [body.url] : [];
const results = [];
for (const item of raw) {
  const url = typeof item === "string" ? item.trim() : String(item?.url || "").trim();
  if (!url) continue;
  if (item && typeof item === "object" && item.contents) {
    return [{
      json: {
        success: false,
        message: "آپلود فایل از طریق این API غیرفعال است؛ فایل را مستقیم به Liom بفرستید و فقط URL را ارسال کنید."
      }
    }];
  }
  if (!/^https:\\/\\//i.test(url)) {
    return [{ json: { success: false, message: "آدرس تصویر نامعتبر است." } }];
  }
  results.push({ url });
}
if (!results.length) {
  return [{
    json: {
      success: false,
      message: "هیچ URLی برای ثبت ارسال نشده است."
    }
  }];
}
return [{ json: { success: true, result: results, message: "آپلود موفق بود." } }];
`;

const UPDATE_IMAGE_PASSTHROUGH_JS = `const body = $json.body || {};
const images = Array.isArray(body.image) ? body.image : [];
const result = [];
for (const item of images) {
  if (item && typeof item === "object" && item.contents) {
    return [{
      json: {
        success: false,
        message: "فایل را مستقیم به Liom آپلود کنید و فقط URL بفرستید."
      }
    }];
  }
  const url = typeof item === "string" ? item.trim() : String(item?.url || "").trim();
  if (!url) continue;
  result.push({
    url,
    main: Boolean(item?.main),
    order: item?.order
  });
}
if (!result.length) {
  return [{ json: { success: false, message: "هیچ URL تصویری ارسال نشده است." } }];
}
return [{ json: { success: true, result } }];
`;

const SLIDER_ADD_HELPER = `const { image, ...result } = $("Webhook Add").first().json.body;

const iconUrl =
  $input.first().json.result?.[0]?.url ||
  result.image_url ||
  result.icon ||
  "";

if (iconUrl) {
  result.icon = iconUrl;
}

return [{ json: result }];
`;

const SLIDER_UPDATE_HELPER = `const { image, ...result } = $("Webhook Update").first().json.body;

const iconUrl =
  $input.first().json.result?.[0]?.url ||
  result.image_url ||
  result.icon ||
  "";

if (iconUrl) {
  result.icon = iconUrl;
}

return [{ json: result }];
`;

const env = readEnv();
const base = (env.N8N_URL || "").replace(/\/$/, "");
const cookie = await login(base, env);

// ---- panel2 ----
{
  const { id, wf } = await loadWorkflow(base, cookie, PANEL2);
  backup(wf, "panel2-uploads-direct-liom");
  const byName = Object.fromEntries(wf.nodes.map(n => [n.name, n]));
  const templateSql = byName.MySQL6 || byName.MySQL3 || byName.panel_upload_insert;
  if (!templateSql) throw new Error("MySQL credential template missing in panel2");

  // /panel/uploads register chain
  const WH = "panel/uploads";
  const PARSE = "panel_uploads_parse";
  const IF_OK = "panel_uploads_if_ok";
  const INSERT = "panel_uploads_insert";
  const FORMAT = "panel_uploads_format";
  const RESPOND = "panel_uploads_respond";

  let wh = byName[WH];
  if (!wh) {
    wh = {
      id: uid(),
      name: WH,
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [1200, -4200],
      webhookId: uid(),
      parameters: {
        httpMethod: "POST",
        path: "panel/uploads",
        responseMode: "responseNode",
        options: {}
      }
    };
    wf.nodes.push(wh);
  } else {
    wh.parameters = {
      ...(wh.parameters || {}),
      httpMethod: "POST",
      path: "panel/uploads",
      responseMode: "responseNode",
      options: wh.parameters?.options || {}
    };
  }

  function ensureCode(name, position, js) {
    let n = byName[name];
    if (!n) {
      n = {
        id: uid(),
        name,
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position,
        parameters: {}
      };
      wf.nodes.push(n);
      byName[name] = n;
    }
    n.parameters = { jsCode: js };
    return n;
  }

  function ensureRespond(name, position) {
    let n = byName[name];
    if (!n) {
      n = {
        id: uid(),
        name,
        type: "n8n-nodes-base.respondToWebhook",
        typeVersion: 1.1,
        position,
        parameters: {}
      };
      wf.nodes.push(n);
      byName[name] = n;
    }
    n.parameters = {
      respondWith: "json",
      responseBody: "={{ JSON.stringify($json) }}",
      options: {}
    };
    return n;
  }

  ensureCode(PARSE, [1420, -4200], REGISTER_PARSE_JS);

  let ifOk = byName[IF_OK];
  if (!ifOk) {
    ifOk = {
      id: uid(),
      name: IF_OK,
      type: "n8n-nodes-base.if",
      typeVersion: 2.2,
      position: [1640, -4200],
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
              id: uid(),
              leftValue: "={{ $json.ok }}",
              rightValue: true,
              operator: {
                type: "boolean",
                operation: "equals"
              }
            }
          ],
          combinator: "and"
        },
        options: {}
      }
    };
    wf.nodes.push(ifOk);
    byName[IF_OK] = ifOk;
  }

  let insert = byName[INSERT];
  if (!insert) {
    insert = {
      id: uid(),
      name: INSERT,
      type: templateSql.type,
      typeVersion: templateSql.typeVersion || 2.4,
      position: [1860, -4300],
      parameters: {},
      credentials: templateSql.credentials
    };
    wf.nodes.push(insert);
    byName[INSERT] = insert;
  }
  insert.parameters = {
    operation: "executeQuery",
    query: `INSERT INTO panel__uploads
  (url, path, original_name, mime_type, uploaded_by, center_id, created_at)
VALUES
  ($1, $2, $3, $4, NULLIF($5, 0), NULLIF($6, 0), NOW());`,
    options: {
      queryReplacement:
        "={{ [$json.url, $json.path, $json.original_name, $json.mime_type, $json.uploaded_by, $json.center_id] }}"
    }
  };
  insert.credentials = templateSql.credentials;

  ensureCode(FORMAT, [2080, -4200], REGISTER_FORMAT_JS);
  ensureRespond(RESPOND, [2300, -4200]);

  // Also merge fail path into FORMAT: when if false, still format error
  // Wire: WH → PARSE → IF → (true) INSERT → FORMAT → RESPOND
  //                    → (false) FORMAT → RESPOND
  wf.connections[WH] = {
    main: [[{ node: PARSE, type: "main", index: 0 }]]
  };
  wf.connections[PARSE] = {
    main: [[{ node: IF_OK, type: "main", index: 0 }]]
  };
  wf.connections[IF_OK] = {
    main: [
      [{ node: INSERT, type: "main", index: 0 }],
      [{ node: FORMAT, type: "main", index: 0 }]
    ]
  };
  wf.connections[INSERT] = {
    main: [[{ node: FORMAT, type: "main", index: 0 }]]
  };
  wf.connections[FORMAT] = {
    main: [[{ node: RESPOND, type: "main", index: 0 }]]
  };

  // Rewrite upload/image happy path to URL-only (no Liom HTTP from n8n)
  const uploadWh = byName["upload/image"];
  if (!uploadWh) throw new Error("upload/image webhook missing");

  let urlOnly = byName["panel_upload_url_only"];
  if (!urlOnly) {
    urlOnly = {
      id: uid(),
      name: "panel_upload_url_only",
      type: "n8n-nodes-base.code",
      typeVersion: 2,
      position: [
        (uploadWh.position?.[0] || 0) + 220,
        uploadWh.position?.[1] || 0
      ],
      parameters: {}
    };
    wf.nodes.push(urlOnly);
  }
  urlOnly.parameters = { jsCode: UPLOAD_IMAGE_URL_ONLY_JS };

  const respond4 = byName["Respond to Webhook4"];
  if (respond4) {
    respond4.parameters = {
      respondWith: "json",
      responseBody: "={{ JSON.stringify($json) }}",
      options: {}
    };
  }

  wf.connections["upload/image"] = {
    main: [[{ node: "panel_upload_url_only", type: "main", index: 0 }]]
  };
  wf.connections["panel_upload_url_only"] = {
    main: [
      [
        {
          node: respond4 ? "Respond to Webhook4" : "panel_uploads_respond",
          type: "main",
          index: 0
        }
      ]
    ]
  };

  // Detach binary/Liom chain from upload/image entry
  for (const dead of [
    "Loop Over Items1",
    "Base64 → Binary1",
    "Upload to API1",
    "Collect Results",
    "Code3",
    "panel_upload_save_row",
    "panel_upload_insert",
    "panel_upload_format"
  ]) {
    // leave nodes in place but disconnect from webhook entry
  }

  // panel/update/image: replace HTTP upload1 with URL passthrough
  const updateWh = byName["update/image"];
  if (updateWh && byName.upload1) {
    // Convert upload1 HTTP node into Code passthrough (keep name for addImage1 refs)
    const upload1 = byName.upload1;
    upload1.type = "n8n-nodes-base.code";
    upload1.typeVersion = 2;
    delete upload1.credentials;
    upload1.parameters = { jsCode: UPDATE_IMAGE_PASSTHROUGH_JS };
  }

  await saveWorkflow(base, cookie, id, wf);
  // Ensure active so new webhook registers
  await fetch(`${base}/rest/workflows/${id}`, {
    method: "PATCH",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ active: true })
  }).catch(() => null);
  console.log("panel2: /panel/uploads + URL-only /upload/image + update/image passthrough OK");
}

// ---- Slider ----
{
  const { id, wf } = await loadWorkflow(base, cookie, SLIDER);
  backup(wf, "slider-image-url");
  const byName = Object.fromEntries(wf.nodes.map(n => [n.name, n]));
  if (byName.Code30) byName.Code30.parameters = { jsCode: SLIDER_ADD_HELPER };
  if (byName["Code Update Helper"]) {
    byName["Code Update Helper"].parameters = { jsCode: SLIDER_UPDATE_HELPER };
  }
  await saveWorkflow(base, cookie, id, wf);
  console.log("Slider: image_url fallback OK");
}

console.log("patch-n8n-panel-uploads-direct-liom done");
