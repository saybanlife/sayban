/**
 * Parallelize the non-nurse public enrichment branch (image1 → Code13).
 * Most centers have caregiver_type NULL and take this path.
 *
 *   node scripts/patch-n8n-center-public-parallel-image1.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_NAME = "sayban2";
const MERGE_NAME = "center_public_enrich_merge_b";
const PARALLEL_NODES = [
  "services5",
  "center_faqs_public",
  "center_amenities_public",
  "working_hours",
  "reviews1",
  "center_care_items_public",
  "center_specialists_public",
  "center_cost_inclusions_public",
  "center_daily_schedule_public",
  "center_activities_public",
  "center_visit_policy_public"
];

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

function clearOutgoing(connections, from) {
  if (connections[from]) connections[from].main = [[]];
}

function link(connections, from, to, index = 0) {
  if (!connections[from]) connections[from] = { main: [[]] };
  if (!connections[from].main) connections[from].main = [[]];
  while (connections[from].main.length <= 0) connections[from].main.push([]);
  const bucket = connections[from].main[0];
  if (!bucket.some(c => c.node === to && c.index === index)) {
    bucket.push({ node: to, type: "main", index });
  }
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
const cookie = (loginRes.headers.getSetCookie?.() || [])
  .map(c => c.split(";")[0])
  .join("; ");

const list = await fetch(`${base}/rest/workflows?limit=250`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const summary = (list.data || []).find(w => w.name === WORKFLOW_NAME);
if (!summary) throw new Error(`workflow ${WORKFLOW_NAME} not found`);

const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const wf = detail.data || detail;

const backupDir = path.join(process.cwd(), ".cursor/sayban-ops/backups");
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(
  backupDir,
  `${WORKFLOW_NAME}-center-parallel-b-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
console.log(`backup: ${backupFile}`);

const nodes = [...wf.nodes];
const connections = JSON.parse(JSON.stringify(wf.connections));
const image1 = nodes.find(n => n.name === "image1");
const code13 = nodes.find(n => n.name === "Code13");
const reviews1 = nodes.find(n => n.name === "reviews1");
if (!image1 || !code13) throw new Error("image1/Code13 missing");

if (revert) {
  clearOutgoing(connections, "image1");
  link(connections, "image1", "services5");
  link(connections, "services5", "center_faqs_public");
  link(connections, "center_faqs_public", "center_amenities_public");
  link(connections, "center_amenities_public", "working_hours");
  link(connections, "working_hours", "reviews1");
  link(connections, "reviews1", "center_care_items_public");
  link(connections, "center_care_items_public", "center_specialists_public");
  link(
    connections,
    "center_specialists_public",
    "center_cost_inclusions_public"
  );
  link(
    connections,
    "center_cost_inclusions_public",
    "center_daily_schedule_public"
  );
  link(connections, "center_daily_schedule_public", "center_activities_public");
  link(connections, "center_activities_public", "center_visit_policy_public");
  clearOutgoing(connections, "center_visit_policy_public");
  link(connections, "center_visit_policy_public", "Code13");
  const idx = nodes.findIndex(n => n.name === MERGE_NAME);
  if (idx !== -1) {
    nodes.splice(idx, 1);
    delete connections[MERGE_NAME];
  }
  if (reviews1?.parameters?.query) {
    reviews1.parameters.query = String(reviews1.parameters.query).replace(
      /\s*LIMIT\s+30\s*;?\s*$/i,
      ";\n"
    );
  }
} else {
  if (reviews1?.parameters?.query && !/\bLIMIT\s+\d+/i.test(reviews1.parameters.query)) {
    reviews1.parameters.query = String(reviews1.parameters.query).replace(
      /\s*;?\s*$/,
      "\nLIMIT 30;\n"
    );
  }

  for (const name of PARALLEL_NODES) {
    clearOutgoing(connections, name);
    const node = nodes.find(n => n.name === name);
    if (!node) throw new Error(`missing ${name}`);
    node.alwaysOutputData = true;
  }
  clearOutgoing(connections, "image1");
  image1.alwaysOutputData = true;

  for (const name of PARALLEL_NODES) {
    link(connections, "image1", name, 0);
  }

  let merge = nodes.find(n => n.name === MERGE_NAME);
  if (!merge) {
    merge = {
      parameters: {
        mode: "append",
        numberInputs: PARALLEL_NODES.length,
        options: {}
      },
      type: "n8n-nodes-base.merge",
      typeVersion: 3,
      position: [
        (code13.position?.[0] ?? 0) - 220,
        (code13.position?.[1] ?? 0) + 40
      ],
      id: crypto.randomUUID(),
      name: MERGE_NAME
    };
    nodes.push(merge);
  } else {
    merge.parameters = {
      mode: "append",
      numberInputs: PARALLEL_NODES.length,
      options: {}
    };
  }

  connections[MERGE_NAME] = {
    main: [[{ node: "Code13", type: "main", index: 0 }]]
  };

  PARALLEL_NODES.forEach((name, index) => {
    connections[name] = {
      main: [[{ node: MERGE_NAME, type: "main", index }]]
    };
  });
}

const patchRes = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: {
    Cookie: cookie,
    "Content-Type": "application/json",
    Accept: "application/json"
  },
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
console.log(revert ? "reverted image1 chain" : "parallelized image1 chain");
