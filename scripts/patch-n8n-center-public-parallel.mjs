/**
 * Speed up public `api/center` enrichment in sayban2.
 *
 * Root cause: after `image`, ~9 MySQL nodes ran strictly sequentially even though
 * every query already binds `$('CenterInfo').item.json.id` and does not depend
 * on the previous result. That alone cost ~1–2s of webhook latency.
 *
 * This patch:
 * 1. Fans `image` out to all `*1` enrichment queries in parallel
 * 2. Merges them, then runs Code12
 * 3. Caps public reviews at 30 rows
 * 4. Softens MySQL15 (page_views) so anonymous `api/center` does not wait on
 *    a missing `center2` JWT expression
 *
 *   node scripts/patch-n8n-center-public-parallel.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_NAME = "sayban2";
const MERGE_NAME = "center_public_enrich_merge";
const PARALLEL_NODES = [
  "services4",
  "center_faqs_public1",
  "center_amenities_public1",
  "working_hours1",
  "reviews",
  "center_care_items_public1",
  "center_specialists_public1",
  "center_cost_inclusions_public1",
  "center_activities_public1"
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

function link(connections, from, to, index = 0) {
  if (!connections[from]) connections[from] = { main: [[]] };
  if (!connections[from].main) connections[from].main = [[]];
  while (connections[from].main.length <= index) {
    connections[from].main.push([]);
  }
  const bucket = connections[from].main[index];
  if (!bucket.some(c => c.node === to)) {
    bucket.push({ node: to, type: "main", index: 0 });
  }
}

function unlink(connections, from, to) {
  const mains = connections[from]?.main;
  if (!mains) return;
  for (const bucket of mains) {
    for (let i = bucket.length - 1; i >= 0; i--) {
      if (bucket[i].node === to) bucket.splice(i, 1);
    }
  }
}

function clearOutgoing(connections, from) {
  if (connections[from]) connections[from].main = [[]];
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
  `${WORKFLOW_NAME}-center-parallel-${new Date()
    .toISOString()
    .replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
console.log(`backup: ${backupFile}`);

const nodes = [...wf.nodes];
const connections = JSON.parse(JSON.stringify(wf.connections));

const reviewsNode = nodes.find(n => n.name === "reviews");
const mysql15 = nodes.find(n => n.name === "MySQL15");
const imageNode = nodes.find(n => n.name === "image");
const code12 = nodes.find(n => n.name === "Code12");

if (!imageNode || !code12 || !reviewsNode) {
  throw new Error("required nodes missing (image / Code12 / reviews)");
}

if (revert) {
  // Restore sequential chain: image → services4 → … → activities1 → Code12
  clearOutgoing(connections, "image");
  link(connections, "image", "services4");
  link(connections, "services4", "center_faqs_public1");
  link(connections, "center_faqs_public1", "center_amenities_public1");
  link(connections, "center_amenities_public1", "working_hours1");
  link(connections, "working_hours1", "reviews");
  link(connections, "reviews", "center_care_items_public1");
  link(connections, "center_care_items_public1", "center_specialists_public1");
  link(
    connections,
    "center_specialists_public1",
    "center_cost_inclusions_public1"
  );
  link(
    connections,
    "center_cost_inclusions_public1",
    "center_activities_public1"
  );
  clearOutgoing(connections, "center_activities_public1");
  link(connections, "center_activities_public1", "Code12");

  const mergeIdx = nodes.findIndex(n => n.name === MERGE_NAME);
  if (mergeIdx !== -1) {
    nodes.splice(mergeIdx, 1);
    delete connections[MERGE_NAME];
  }

  // Remove LIMIT from reviews if we added it
  const q = String(reviewsNode.parameters?.query || "");
  reviewsNode.parameters.query = q.replace(/\s*LIMIT\s+30\s*;?\s*$/i, ";\n");

  if (mysql15?.parameters?.valuesToSend?.values) {
    const userCol = mysql15.parameters.valuesToSend.values.find(
      v => v.column === "user_id"
    );
    if (userCol) {
      userCol.value = "={{ $('center2').item.json.jwtPayload.id }}";
    }
  }
} else {
  // Cap public reviews payload
  let reviewQuery = String(reviewsNode.parameters?.query || "");
  if (!/\bLIMIT\s+\d+/i.test(reviewQuery)) {
    reviewQuery = reviewQuery.replace(/\s*;?\s*$/, "\nLIMIT 30;\n");
    reviewsNode.parameters.query = reviewQuery;
  }

  // Soft page_views user for anonymous public hits
  if (mysql15?.parameters?.valuesToSend?.values) {
    const userCol = mysql15.parameters.valuesToSend.values.find(
      v => v.column === "user_id"
    );
    if (userCol) {
      userCol.value =
        "={{ (() => { try { return $('center2').item.json.jwtPayload.id; } catch (e) { return 0; } })() }}";
    }
  }

  // Break sequential chain outputs among parallel nodes
  for (const name of PARALLEL_NODES) {
    clearOutgoing(connections, name);
  }
  clearOutgoing(connections, "image");

  // Fan-out from image
  for (const name of PARALLEL_NODES) {
    link(connections, "image", name);
  }

  // Merge all parallel results, then Code12
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
        (code12.position?.[0] ?? 0) - 220,
        (code12.position?.[1] ?? 0) + 40
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

  // Empty enrichment tables must still emit so Merge does not hang.
  for (const name of PARALLEL_NODES) {
    const node = nodes.find(n => n.name === name);
    if (!node) throw new Error(`missing parallel node: ${name}`);
    node.alwaysOutputData = true;
  }
  imageNode.alwaysOutputData = true;

  connections[MERGE_NAME] = { main: [[{ node: "Code12", type: "main", index: 0 }]] };

  // Each parallel node feeds a distinct Merge input index
  PARALLEL_NODES.forEach((name, index) => {
    if (!connections[name]) connections[name] = { main: [[]] };
    connections[name].main = [
      [{ node: MERGE_NAME, type: "main", index }]
    ];
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
  const text = await patchRes.text();
  throw new Error(`workflow patch failed: ${patchRes.status} ${text}`);
}

console.log(revert ? "reverted sequential chain" : "applied parallel enrichment");
console.log("workflow id:", summary.id);
