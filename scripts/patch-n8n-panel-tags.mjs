/**
 * Add Super Admin tag library endpoints on the active `faqs` workflow:
 *   GET  /panel/tags
 *   POST /panel/tags/add     { name, slug?, description? }
 *   POST /panel/tags/delete  { id }
 *
 * Delete clears centers__tags rows for that tag_id, then removes the tag.
 *
 *   node scripts/patch-n8n-panel-tags.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const WORKFLOW_NAME = "faqs";
const MYSQL_CREDENTIALS = {
  mySql: { id: "oNRa6pdlbbcsx18m", name: "MySQL account" }
};
const PANEL_WEBHOOK_ID = "242a454c-373d-43ea-a5fd-d5128b34cb74";

function uuid() {
  return randomUUID();
}

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

function webhookNode(name, routePath, position, httpMethod = "GET") {
  return {
    parameters: {
      httpMethod,
      path: routePath,
      responseMode: "responseNode",
      options: {}
    },
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position,
    id: uuid(),
    name,
    webhookId: PANEL_WEBHOOK_ID
  };
}

function mysqlNode(name, query, queryReplacement, position) {
  return {
    parameters: {
      operation: "executeQuery",
      query,
      options: queryReplacement ? { queryReplacement } : {}
    },
    type: "n8n-nodes-base.mySql",
    typeVersion: 2.4,
    position,
    id: uuid(),
    name,
    alwaysOutputData: true,
    executeOnce: true,
    credentials: MYSQL_CREDENTIALS,
    onError: "continueRegularOutput"
  };
}

function codeNode(name, jsCode, position) {
  return {
    parameters: { jsCode },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position,
    id: uuid(),
    name
  };
}

function respondNode(name, position) {
  return {
    parameters: { options: {} },
    type: "n8n-nodes-base.respondToWebhook",
    typeVersion: 1.4,
    position,
    id: uuid(),
    name
  };
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
  `${WORKFLOW_NAME}-panel-tags-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
console.log(`backup written: ${path.relative(process.cwd(), backupFile)}`);

const nodes = JSON.parse(JSON.stringify(wf.nodes));
const connections = JSON.parse(JSON.stringify(wf.connections));

const existing = new Set([
  "panel/tags",
  "panel/tags/add",
  "panel/tags/delete"
]);
for (const name of existing) {
  if (nodes.some(n => n.name === name)) {
    throw new Error(`node already exists: ${name} — aborting to avoid duplicates`);
  }
}

const maxX = Math.max(...nodes.map(n => (n.position && n.position[0]) || 0));
const baseX = maxX + 280;
let y = 40;
const step = 220;

// GET /panel/tags
{
  const wh = webhookNode("panel/tags", "/panel/tags", [baseX, y], "GET");
  const mysql = mysqlNode(
    "panel_tags_list",
    "SELECT id, name, slug, description\nFROM tags\nORDER BY id DESC;",
    "",
    [baseX + 220, y]
  );
  const code = codeNode(
    "panel_tags_list_wrap",
    `const output = [];
for (const item of items) {
  const row = item.json || {};
  if (row.id != null) output.push(row);
}
return [{ json: { success: true, result: output } }];`,
    [baseX + 440, y]
  );
  const respond = respondNode("Respond panel/tags", [baseX + 660, y]);
  nodes.push(wh, mysql, code, respond);
  connections["panel/tags"] = {
    main: [[{ node: "panel_tags_list", type: "main", index: 0 }]]
  };
  connections["panel_tags_list"] = {
    main: [[{ node: "panel_tags_list_wrap", type: "main", index: 0 }]]
  };
  connections["panel_tags_list_wrap"] = {
    main: [[{ node: "Respond panel/tags", type: "main", index: 0 }]]
  };
  y += step;
}

// POST /panel/tags/add
{
  const wh = webhookNode(
    "panel/tags/add",
    "/panel/tags/add",
    [baseX, y],
    "POST"
  );
  const mysql = {
    parameters: {
      operation: "executeQuery",
      query:
        "INSERT INTO tags (name, slug, description)\nVALUES ($1, NULLIF($2, ''), NULLIF($3, ''));",
      options: {
        queryReplacement:
          "={{ String($json.body.name || '').trim() }},{{ String($json.body.slug || '').trim() }},{{ String($json.body.description || '').trim() }}",
        detailedOutput: true
      }
    },
    type: "n8n-nodes-base.mySql",
    typeVersion: 2.4,
    position: [baseX + 220, y],
    id: uuid(),
    name: "panel_tags_insert",
    credentials: MYSQL_CREDENTIALS,
    onError: "continueRegularOutput"
  };
  const code = codeNode(
    "panel_tags_insert_wrap",
    `const first = $input.first().json || {};
const id = first.data?.insertId ?? first.insertId ?? null;
return [{ json: { success: true, result: { id } } }];`,
    [baseX + 440, y]
  );
  const respond = respondNode("Respond panel/tags/add", [baseX + 660, y]);
  nodes.push(wh, mysql, code, respond);
  connections["panel/tags/add"] = {
    main: [[{ node: "panel_tags_insert", type: "main", index: 0 }]]
  };
  connections["panel_tags_insert"] = {
    main: [[{ node: "panel_tags_insert_wrap", type: "main", index: 0 }]]
  };
  connections["panel_tags_insert_wrap"] = {
    main: [[{ node: "Respond panel/tags/add", type: "main", index: 0 }]]
  };
  y += step;
}

// POST /panel/tags/delete — unlink centers, then drop tag (same pattern as faqs)
{
  const wh = webhookNode(
    "panel/tags/delete",
    "/panel/tags/delete",
    [baseX, y],
    "POST"
  );
  const unlink = {
    parameters: {
      operation: "executeQuery",
      query: "DELETE FROM centers__tags WHERE tag_id = $1;",
      options: {
        queryReplacement: "={{ $json.body.id.toString() }}"
      }
    },
    type: "n8n-nodes-base.mySql",
    typeVersion: 2.4,
    position: [baseX + 220, y],
    id: uuid(),
    name: "panel_tags_unlink",
    alwaysOutputData: true,
    executeOnce: true,
    credentials: MYSQL_CREDENTIALS,
    onError: "continueRegularOutput"
  };
  const del = {
    parameters: {
      operation: "executeQuery",
      query: "DELETE FROM tags WHERE id = $1;",
      options: {
        queryReplacement:
          "={{ $('panel/tags/delete').item.json.body.id.toString() }}"
      }
    },
    type: "n8n-nodes-base.mySql",
    typeVersion: 2.4,
    position: [baseX + 440, y],
    id: uuid(),
    name: "panel_tags_delete",
    alwaysOutputData: true,
    executeOnce: true,
    credentials: MYSQL_CREDENTIALS,
    onError: "continueRegularOutput"
  };
  const code = codeNode(
    "panel_tags_delete_wrap",
    `return [{ json: { success: true, result: true } }];`,
    [baseX + 660, y]
  );
  const respond = respondNode("Respond panel/tags/delete", [baseX + 880, y]);
  nodes.push(wh, unlink, del, code, respond);
  connections["panel/tags/delete"] = {
    main: [[{ node: "panel_tags_unlink", type: "main", index: 0 }]]
  };
  connections["panel_tags_unlink"] = {
    main: [[{ node: "panel_tags_delete", type: "main", index: 0 }]]
  };
  connections["panel_tags_delete"] = {
    main: [[{ node: "panel_tags_delete_wrap", type: "main", index: 0 }]]
  };
  connections["panel_tags_delete_wrap"] = {
    main: [[{ node: "Respond panel/tags/delete", type: "main", index: 0 }]]
  };
}

const patchRes = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: wf.name,
    nodes,
    connections,
    settings: wf.settings || {},
    staticData: wf.staticData
  })
});
if (!patchRes.ok) {
  throw new Error(`patch failed: ${patchRes.status} ${await patchRes.text()}`);
}

// New webhook paths register on save while the workflow stays active.
console.log("added GET /panel/tags, POST /panel/tags/add, POST /panel/tags/delete");
