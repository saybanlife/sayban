/**
 * Add questionnaire category CRUD and enrich the existing flat question list.
 * Existing question create/update/delete nodes are kept intact.
 *
 *   node scripts/patch-n8n-question-categories.mjs
 *   node scripts/patch-n8n-question-categories.mjs --revert
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const WORKFLOW_NAME = "panel-question";
const PREFIX = "question_categories_";
const revert = process.argv.includes("--revert");

const PREVIOUS_LIST_QUERY = `SELECT *
FROM \`centers__question\`
WHERE 1
ORDER BY \`created_at\` DESC;`;

const NEXT_LIST_QUERY = `SELECT q.*,
       c.title AS category_title,
       c.description AS category_description,
       c.sort_order AS category_sort_order
FROM centers__question q
LEFT JOIN centers__question_categories c ON c.id = q.category_id
ORDER BY CASE WHEN q.category_id IS NULL THEN 1 ELSE 0 END ASC,
         c.sort_order ASC, c.id ASC, q.created_at DESC;`;

const PREVIOUS_LIST_CODE = `const output = [];

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

const NEXT_LIST_CODE = `const output = [];
let previousCategoryId = null;

for (const item of items) {
  const data = { ...item.json };
  const categoryId = data.category_id == null ? null : Number(data.category_id);
  data.category_first = categoryId != null && categoryId !== previousCategoryId;
  if (categoryId != null) previousCategoryId = categoryId;
  output.push(data);
}

return [{ json: { success: true, result: output } }];`;

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
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      })
  );
}

function webhookNode(name, routePath, position, method = "GET") {
  return {
    parameters: {
      httpMethod: method,
      path: routePath,
      responseMode: "responseNode",
      options: {}
    },
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position,
    id: randomUUID(),
    name,
    webhookId: randomUUID()
  };
}

function mysqlNode(name, query, queryReplacement, position, credentials) {
  return {
    parameters: {
      operation: "executeQuery",
      query,
      options: queryReplacement ? { queryReplacement } : {}
    },
    type: "n8n-nodes-base.mySql",
    typeVersion: 2.4,
    position,
    id: randomUUID(),
    name,
    alwaysOutputData: true,
    executeOnce: true,
    credentials
  };
}

function codeNode(name, jsCode, position) {
  return {
    parameters: { jsCode },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position,
    id: randomUUID(),
    name
  };
}

function respondNode(name, position) {
  return {
    parameters: { options: {} },
    type: "n8n-nodes-base.respondToWebhook",
    typeVersion: 1.4,
    position,
    id: randomUUID(),
    name
  };
}

const env = readEnv();
const base = String(env.N8N_URL || "").replace(/\/$/, "");
const loginResponse = await fetch(`${base}/rest/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    emailOrLdapLoginId: env.N8N_USER,
    password: env.N8N_PASSWORD
  })
});
if (!loginResponse.ok) {
  throw new Error(`n8n login failed: ${loginResponse.status}`);
}
const cookie = (loginResponse.headers.get("set-cookie") || "").split(";")[0];
const list = await fetch(`${base}/rest/workflows?limit=250`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(response => response.json());
const summary = (list.data || []).find(item => item.name === WORKFLOW_NAME);
if (!summary) throw new Error(`workflow ${WORKFLOW_NAME} not found`);

const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(response => response.json());
const workflow = detail.data || detail;
const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(
  backupDir,
  `${WORKFLOW_NAME}-question-categories-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(workflow, null, 2), "utf8");
console.log(`backup written: ${path.relative(process.cwd(), backupFile)}`);

let nodes = structuredClone(workflow.nodes);
const connections = structuredClone(workflow.connections);
const listQueryNode = nodes.find(node => node.name === "MySQL43");
const listCodeNode = nodes.find(node => node.name === "Code41");
if (!listQueryNode || !listCodeNode) {
  throw new Error("question list nodes not found; aborting");
}

listQueryNode.parameters.query = revert ? PREVIOUS_LIST_QUERY : NEXT_LIST_QUERY;
listCodeNode.parameters.jsCode = revert ? PREVIOUS_LIST_CODE : NEXT_LIST_CODE;

if (revert) {
  const removedNames = new Set(
    nodes.filter(node => node.name.startsWith(PREFIX)).map(node => node.name)
  );
  nodes = nodes.filter(node => !removedNames.has(node.name));
  for (const name of removedNames) delete connections[name];
  for (const connection of Object.values(connections)) {
    for (const outputs of connection.main || []) {
      for (let index = outputs.length - 1; index >= 0; index -= 1) {
        if (removedNames.has(outputs[index]?.node)) outputs.splice(index, 1);
      }
    }
  }
} else {
  if (nodes.some(node => node.name.startsWith(PREFIX))) {
    throw new Error("question category nodes already exist; aborting duplicate patch");
  }
  const credentials = listQueryNode.credentials;
  if (!credentials?.mySql) throw new Error("MySQL credentials not found");
  const maxX = Math.max(...nodes.map(node => node.position?.[0] || 0));
  const startX = maxX + 300;

  const addFlow = flowNodes => nodes.push(...flowNodes);
  const connect = (from, to) => {
    connections[from] = { main: [[{ node: to, type: "main", index: 0 }]] };
  };

  const listWebhook = webhookNode(
    `${PREFIX}list_webhook`,
    "/panel/question/categories",
    [startX, 0]
  );
  const listMysql = mysqlNode(
    `${PREFIX}list_mysql`,
    `SELECT c.id AS category_id, c.title, c.description, c.sort_order,
       q.id AS question_id, q.question_text, q.is_required, q.type,
       q.options, q.is_active, q.created_at
FROM centers__question_categories c
LEFT JOIN centers__question q ON q.category_id = c.id
ORDER BY c.sort_order ASC, c.id ASC, q.created_at DESC;`,
    "",
    [startX + 220, 0],
    credentials
  );
  const listWrap = codeNode(
    `${PREFIX}list_wrap`,
    `const categories = new Map();
for (const item of items) {
  const row = item.json || {};
  const id = Number(row.category_id);
  if (!id) continue;
  if (!categories.has(id)) {
    categories.set(id, {
      id,
      title: row.title || '',
      description: row.description || '',
      sort_order: Number(row.sort_order) || 0,
      questions: []
    });
  }
  if (row.question_id != null) {
    categories.get(id).questions.push({
      id: Number(row.question_id),
      question_text: row.question_text,
      is_required: row.is_required,
      type: row.type,
      options: row.options,
      is_active: row.is_active,
      created_at: row.created_at,
      category_id: id
    });
  }
}
return [{ json: { success: true, result: [...categories.values()] } }];`,
    [startX + 440, 0]
  );
  const listRespond = respondNode(`${PREFIX}list_respond`, [startX + 660, 0]);
  addFlow([listWebhook, listMysql, listWrap, listRespond]);
  connect(listWebhook.name, listMysql.name);
  connect(listMysql.name, listWrap.name);
  connect(listWrap.name, listRespond.name);

  const saveWebhook = webhookNode(
    `${PREFIX}save_webhook`,
    "/panel/question/categories/update",
    [startX, 240],
    "POST"
  );
  const saveNormalize = codeNode(
    `${PREFIX}save_normalize`,
    `const body = $input.first().json.body || {};
const title = String(body.title || '').trim().slice(0, 120);
if (!title) throw new Error('عنوان دسته الزامی است.');
return [{ json: {
  id: Number(body.id) || 0,
  title,
  description: String(body.description || '').trim().slice(0, 1000),
  sort_order: Math.max(0, Math.min(100000, Number(body.sort_order) || 0))
} }];`,
    [startX + 220, 240]
  );
  const saveMysql = mysqlNode(
    `${PREFIX}save_mysql`,
    `INSERT INTO centers__question_categories (id, title, description, sort_order)
VALUES (NULLIF($1, 0), $2, NULLIF($3, ''), $4)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  description = VALUES(description),
  sort_order = VALUES(sort_order);`,
    "={{ $json.id.toString() }},{{ $json.title }},{{ $json.description }},{{ $json.sort_order.toString() }}",
    [startX + 440, 240],
    credentials
  );
  const saveWrap = codeNode(
    `${PREFIX}save_wrap`,
    `return [{ json: { success: true, message: 'دسته با موفقیت ذخیره شد.' } }];`,
    [startX + 660, 240]
  );
  const saveRespond = respondNode(`${PREFIX}save_respond`, [startX + 880, 240]);
  addFlow([saveWebhook, saveNormalize, saveMysql, saveWrap, saveRespond]);
  connect(saveWebhook.name, saveNormalize.name);
  connect(saveNormalize.name, saveMysql.name);
  connect(saveMysql.name, saveWrap.name);
  connect(saveWrap.name, saveRespond.name);

  const deleteWebhook = webhookNode(
    `${PREFIX}delete_webhook`,
    "/panel/question/categories/delete",
    [startX, 480],
    "POST"
  );
  const deleteNormalize = codeNode(
    `${PREFIX}delete_normalize`,
    `const id = Number($input.first().json.body?.id);
if (!Number.isInteger(id) || id <= 0) throw new Error('شناسه دسته نامعتبر است.');
return [{ json: { id } }];`,
    [startX + 220, 480]
  );
  const unlinkMysql = mysqlNode(
    `${PREFIX}delete_unlink`,
    "UPDATE centers__question SET category_id = NULL WHERE category_id = $1;",
    "={{ $json.id.toString() }}",
    [startX + 440, 480],
    credentials
  );
  const deleteMysql = mysqlNode(
    `${PREFIX}delete_mysql`,
    "DELETE FROM centers__question_categories WHERE id = $1;",
    `={{ $('${PREFIX}delete_normalize').first().json.id.toString() }}`,
    [startX + 660, 480],
    credentials
  );
  const deleteWrap = codeNode(
    `${PREFIX}delete_wrap`,
    `return [{ json: { success: true, message: 'دسته حذف شد و سؤال‌ها حفظ شدند.' } }];`,
    [startX + 880, 480]
  );
  const deleteRespond = respondNode(
    `${PREFIX}delete_respond`,
    [startX + 1100, 480]
  );
  addFlow([
    deleteWebhook,
    deleteNormalize,
    unlinkMysql,
    deleteMysql,
    deleteWrap,
    deleteRespond
  ]);
  connect(deleteWebhook.name, deleteNormalize.name);
  connect(deleteNormalize.name, unlinkMysql.name);
  connect(unlinkMysql.name, deleteMysql.name);
  connect(deleteMysql.name, deleteWrap.name);
  connect(deleteWrap.name, deleteRespond.name);
}

const patchResponse = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: {
    Cookie: cookie,
    "Content-Type": "application/json",
    Accept: "application/json"
  },
  body: JSON.stringify({
    name: workflow.name,
    nodes,
    connections,
    settings: workflow.settings || {},
    staticData: workflow.staticData
  })
});
if (!patchResponse.ok) {
  throw new Error(
    `workflow patch failed: ${patchResponse.status} ${await patchResponse.text()}`
  );
}
console.log(revert ? "question category workflow reverted" : "question category workflow patched");

