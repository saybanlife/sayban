/**
 * Harden `/panel/users/delete` in workflow `panel-user`:
 * - JWT auth (super_admin)
 * - cascade delete related rows, then users
 * - accurate success/failure messages
 *
 *   node scripts/patch-n8n-panel-users-delete.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_ID = "A9UoaMCH5ThcTbG5";
const WEBHOOK_NAME = "categories4";
const OLD_MYSQL = "MySQL41";
const OLD_OK = "Respond to Webhook47";
const OLD_FAIL = "Respond to Webhook48";

const AUTH = "users_delete_auth";
const SQL = "users_delete_cascade";
const VERIFY = "users_delete_verify";
const FORMAT = "users_delete_format";
const RESPOND = "users_delete_respond";

const ADDED = [AUTH, SQL, VERIFY, FORMAT, RESPOND];

const AUTH_JS = `const input = items[0].json || {};
const auth = String(input.headers?.authorization || "");
const raw = auth.replace(/^Bearer\\s+/i, "").trim();
let claims = {};
try {
  const part = (raw.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
  claims = JSON.parse(Buffer.from(part, "base64").toString("utf8")) || {};
} catch (e) {
  claims = {};
}
const body = input.body || {};
const user_id = Number(body.id) || 0;
const role = String(claims.role || "");
return [{
  json: {
    panel_user_id: Number(claims.id) || 0,
    role,
    user_id,
    ok: role === 'super_admin' && user_id > 0
  }
}];`;

const CASCADE_SQL = `DELETE p FROM centers__reply p
INNER JOIN centers__reviews r ON r.id = p.review_id
WHERE r.user_id = $1;

DELETE FROM centers__reviews WHERE user_id = $1;

DELETE rq FROM reservations__questionnaires rq
INNER JOIN reservations r ON r.id = rq.reservation_id
WHERE r.user_id = $1;

DELETE FROM reservations WHERE user_id = $1;

DELETE FROM users__notification WHERE userId = $1;
DELETE FROM users__patient WHERE user_id = $1;
DELETE FROM users__addresses WHERE user_id = $1;

DELETE FROM users WHERE id = $1;`;

const VERIFY_SQL = "SELECT id FROM users WHERE id = $1 LIMIT 1;";

const FORMAT_JS = `const auth = $('${AUTH}').first().json;
if (!auth.ok) {
  const msg = auth.role !== 'super_admin'
    ? 'دسترسی حذف کاربر ندارید.'
    : 'شناسه کاربر نامعتبر است.';
  return [{ json: { success: false, message: msg } }];
}
const stillThere = items.some(item => item.json && item.json.id != null);
if (stillThere) {
  return [{ json: { success: false, message: 'حذف کاربر ناموفق بود. ممکن است رزرو یا وابستگی فعال داشته باشد.' } }];
}
return [{ json: { success: true, message: 'کاربر با موفقیت حذف شد.', deleted_id: auth.user_id } }];
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

const detail = await fetch(`${base}/rest/workflows/${WORKFLOW_ID}`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const wf = detail.data || detail;

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(
  backupDir,
  `panel-user-delete-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
console.log(`backup written: ${path.relative(process.cwd(), backupFile)}`);

let nodes = [...wf.nodes];
const connections = JSON.parse(JSON.stringify(wf.connections));

const webhook = nodes.find(n => n.name === WEBHOOK_NAME);
const sqlTemplate =
  nodes.find(n => n.name === OLD_MYSQL) ||
  nodes.find(n => n.name === "MySQL26");
const codeTemplate = nodes.find(n => n.name === "Code23");
const respondTemplate =
  nodes.find(n => n.name === OLD_OK) ||
  nodes.find(n => n.name === "Respond to Webhook51");
if (!webhook || !sqlTemplate || !codeTemplate || !respondTemplate) {
  throw new Error("template nodes missing in panel-user workflow");
}

if (revert) {
  // Restore is manual from backup; only remove added nodes here.
  nodes = nodes.filter(n => !ADDED.includes(n.name));
  for (const name of ADDED) delete connections[name];
  delete connections[WEBHOOK_NAME];
  connections[WEBHOOK_NAME] = {
    main: [[{ node: OLD_MYSQL, type: "main", index: 0 }]]
  };
} else {
  if (nodes.some(n => n.name === AUTH)) {
    console.log("users delete patch already applied");
    process.exit(0);
  }

  // JWT on delete webhook (clone credentials from panel2 `panel reviews list`).
  webhook.parameters.authentication = "jwtAuth";
  webhook.parameters.responseMode = "responseNode";
  const panel2List = await fetch(`${base}/rest/workflows?limit=250`, {
    headers: { Cookie: cookie, Accept: "application/json" }
  })
    .then(r => r.json())
    .then(list => (list.data || []).find(w => w.name === "panel2"));
  if (panel2List?.id) {
    const panel2 = await fetch(`${base}/rest/workflows/${panel2List.id}`, {
      headers: { Cookie: cookie, Accept: "application/json" }
    }).then(r => r.json());
    const p2Nodes = panel2?.data?.nodes || panel2?.nodes || [];
    const jwtDonor = p2Nodes.find(n => n.name === "panel reviews list");
    if (jwtDonor?.credentials?.jwtAuth) {
      webhook.credentials = JSON.parse(JSON.stringify(jwtDonor.credentials));
    }
  }

  const pos = webhook.position || [0, 0];
  const y = pos[1] + 180;

  nodes.push(
    {
      parameters: { jsCode: AUTH_JS },
      type: "n8n-nodes-base.code",
      typeVersion: codeTemplate.typeVersion,
      position: [pos[0] + 220, y],
      id: crypto.randomUUID(),
      name: AUTH
    },
    {
      parameters: {
        operation: "executeQuery",
        query: CASCADE_SQL,
        options: {
          queryReplacement: "={{ $('users_delete_auth').first().json.user_id.toString() }}"
        }
      },
      type: "n8n-nodes-base.mySql",
      typeVersion: sqlTemplate.typeVersion,
      position: [pos[0] + 440, y],
      id: crypto.randomUUID(),
      name: SQL,
      alwaysOutputData: true,
      credentials: JSON.parse(JSON.stringify(sqlTemplate.credentials || {}))
    },
    {
      parameters: {
        operation: "executeQuery",
        query: VERIFY_SQL,
        options: {
          queryReplacement:
            "={{ $('users_delete_auth').first().json.user_id.toString() }}"
        }
      },
      type: "n8n-nodes-base.mySql",
      typeVersion: sqlTemplate.typeVersion,
      position: [pos[0] + 660, y],
      id: crypto.randomUUID(),
      name: VERIFY,
      alwaysOutputData: true,
      credentials: JSON.parse(JSON.stringify(sqlTemplate.credentials || {}))
    },
    {
      parameters: { jsCode: FORMAT_JS },
      type: "n8n-nodes-base.code",
      typeVersion: codeTemplate.typeVersion,
      position: [pos[0] + 880, y],
      id: crypto.randomUUID(),
      name: FORMAT
    },
    {
      parameters: {
        respondWith: "json",
        responseBody: "={{ JSON.stringify($json) }}",
        options: {}
      },
      type: "n8n-nodes-base.respondToWebhook",
      typeVersion: respondTemplate.typeVersion,
      position: [pos[0] + 1100, y],
      id: crypto.randomUUID(),
      name: RESPOND
    }
  );

  delete connections[WEBHOOK_NAME];
  delete connections[OLD_MYSQL];
  connections[WEBHOOK_NAME] = {
    main: [[{ node: AUTH, type: "main", index: 0 }]]
  };
  connections[AUTH] = {
    main: [[{ node: SQL, type: "main", index: 0 }]]
  };
  connections[SQL] = {
    main: [[{ node: VERIFY, type: "main", index: 0 }]]
  };
  connections[VERIFY] = {
    main: [[{ node: FORMAT, type: "main", index: 0 }]]
  };
  connections[FORMAT] = {
    main: [[{ node: RESPOND, type: "main", index: 0 }]]
  };

  // Retire legacy nodes from the graph (keep in workflow for easy rollback).
  nodes = nodes.map(n => {
    if (n.name === OLD_MYSQL) {
      return { ...n, disabled: true };
    }
    return n;
  });
}

const patchRes = await fetch(`${base}/rest/workflows/${WORKFLOW_ID}`, {
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

console.log(
  revert
    ? "reverted panel/users/delete patch (restore backup if needed)"
    : "patched panel/users/delete with auth + cascade delete"
);
