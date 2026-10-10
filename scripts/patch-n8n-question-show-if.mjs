/**
 * Normalize show_if fields on panel question create/update (Code42).
 *
 *   node scripts/patch-n8n-question-show-if.mjs
 *   node scripts/patch-n8n-question-show-if.mjs --revert
 */
import fs from "node:fs";
import path from "node:path";

const WORKFLOW_NAME = "panel-question";
const revert = process.argv.includes("--revert");

const PREVIOUS_CODE = `const { ...result } = $("categories6").first().json.body;

return [
  {
    json: result
  }
];
`;

const NEXT_CODE = `const body = $("categories6").first().json.body || {};
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
  `${WORKFLOW_NAME}-show-if-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(workflow, null, 2), "utf8");
console.log(`backup written: ${path.relative(process.cwd(), backupFile)}`);

const nodes = structuredClone(workflow.nodes);
const codeNode = nodes.find(node => node.name === "Code42");
if (!codeNode) throw new Error("Code42 not found");
codeNode.parameters.jsCode = revert ? PREVIOUS_CODE : NEXT_CODE;

const payload = {
  name: workflow.name,
  nodes,
  connections: workflow.connections,
  settings: workflow.settings,
  staticData: workflow.staticData
};
const patchResponse = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: {
    Cookie: cookie,
    Accept: "application/json",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(payload)
});
if (!patchResponse.ok) {
  throw new Error(
    `workflow patch failed: ${patchResponse.status} ${await patchResponse.text()}`
  );
}
console.log(
  revert
    ? "reverted Code42 show_if normalization"
    : "patched Code42 show_if normalization"
);
