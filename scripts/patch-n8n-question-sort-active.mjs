/**
 * Order questions by sort_order; normalize is_active + sort_order on save.
 *
 *   node scripts/patch-n8n-question-sort-active.mjs
 *   node scripts/patch-n8n-question-sort-active.mjs --revert
 */
import fs from "node:fs";
import path from "node:path";

const WORKFLOW_NAME = "panel-question";
const revert = process.argv.includes("--revert");

const PREVIOUS_LIST_QUERY = `SELECT q.*,
       c.title AS category_title,
       c.description AS category_description,
       c.sort_order AS category_sort_order
FROM centers__question q
LEFT JOIN centers__question_categories c ON c.id = q.category_id
ORDER BY CASE WHEN q.category_id IS NULL THEN 1 ELSE 0 END ASC,
         c.sort_order ASC, c.id ASC, q.created_at DESC;`;

const NEXT_LIST_QUERY = `SELECT q.*,
       c.title AS category_title,
       c.description AS category_description,
       c.sort_order AS category_sort_order
FROM centers__question q
LEFT JOIN centers__question_categories c ON c.id = q.category_id
ORDER BY CASE WHEN q.category_id IS NULL THEN 1 ELSE 0 END ASC,
         c.sort_order ASC, c.id ASC,
         q.sort_order ASC, q.id ASC;`;

const PREVIOUS_CODE42 = `const body = $("categories6").first().json.body || {};
const selfId = Number(body.id) || 0;
let showIfQuestionId = Number(body.show_if_question_id) || 0;
let showIfOption = String(body.show_if_option || "").trim().slice(0, 255);

if (!showIfQuestionId || !showIfOption || (selfId > 0 && showIfQuestionId === selfId)) {
  showIfQuestionId = null;
  showIfOption = null;
} else {
  showIfQuestionId = showIfQuestionId;
  showIfOption = showIfOption;
}

return [
  {
    json: {
      ...body,
      show_if_question_id: showIfQuestionId,
      show_if_option: showIfOption
    }
  }
];
`;

const NEXT_CODE42 = `const body = $("categories6").first().json.body || {};
const selfId = Number(body.id) || 0;
let showIfQuestionId = Number(body.show_if_question_id) || 0;
let showIfOption = String(body.show_if_option || "").trim().slice(0, 255);

if (!showIfQuestionId || !showIfOption || (selfId > 0 && showIfQuestionId === selfId)) {
  showIfQuestionId = null;
  showIfOption = null;
}

const rawActive = body.is_active;
const isActive =
  rawActive === false || rawActive === 0 || rawActive === "0" ? 0 : 1;
let sortOrder = Number(body.sort_order);
if (!Number.isFinite(sortOrder) || sortOrder < 0) {
  sortOrder = selfId > 0 ? selfId : 0;
}

return [
  {
    json: {
      ...body,
      show_if_question_id: showIfQuestionId,
      show_if_option: showIfOption,
      is_active: isActive,
      sort_order: sortOrder
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
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      })
  );
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
  `${WORKFLOW_NAME}-sort-active-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(workflow, null, 2), "utf8");
console.log(`backup written: ${path.relative(process.cwd(), backupFile)}`);

const nodes = structuredClone(workflow.nodes);
const listQueryNode = nodes.find(node => node.name === "MySQL43");
const codeNode = nodes.find(node => node.name === "Code42");
if (!listQueryNode || !codeNode) {
  throw new Error("MySQL43/Code42 not found");
}
listQueryNode.parameters.query = revert ? PREVIOUS_LIST_QUERY : NEXT_LIST_QUERY;
codeNode.parameters.jsCode = revert ? PREVIOUS_CODE42 : NEXT_CODE42;

const patchResponse = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: {
    Cookie: cookie,
    Accept: "application/json",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    name: workflow.name,
    nodes,
    connections: workflow.connections,
    settings: workflow.settings || {},
    staticData: workflow.staticData
  })
});
if (!patchResponse.ok) {
  throw new Error(
    `workflow patch failed: ${patchResponse.status} ${await patchResponse.text()}`
  );
}
console.log(revert ? "reverted sort/active patch" : "patched sort/active");
