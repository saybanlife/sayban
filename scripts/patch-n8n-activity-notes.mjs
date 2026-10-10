/**
 * Lets Panel save a short note per selected activity, and exposes that note
 * on the public center page.
 *
 * Patches:
 *   faqs    → panel_activities_center SELECT
 *           → panel_activities_sync_prep (accept { id, note })
 *           → panel_activities_sync_insert (write note)
 *   sayban2 → center_activities_public1 SELECT
 *
 * Each workflow is backed up to scripts/backup/ before it is written.
 *
 *   node scripts/patch-n8n-activity-notes.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";

const PREV_CENTER_SELECT = `SELECT a.id, a.name, a.slug, a.icon, a.sort_order
FROM centers__activities ca
INNER JOIN activities a ON a.id = ca.activity_id
WHERE ca.center_id = $1 AND a.is_active = 1
ORDER BY a.sort_order ASC, a.id ASC;`;

const NEXT_CENTER_SELECT = `SELECT a.id, a.name, a.slug, a.icon, a.sort_order, ca.note
FROM centers__activities ca
INNER JOIN activities a ON a.id = ca.activity_id
WHERE ca.center_id = $1 AND a.is_active = 1
ORDER BY a.sort_order ASC, a.id ASC;`;

const PREV_PUBLIC_SELECT = `SELECT a.id, a.name, a.slug, a.icon
FROM centers__activities ca
INNER JOIN activities a ON a.id = ca.activity_id
WHERE ca.center_id = $1 AND a.is_active = 1
ORDER BY a.sort_order ASC, a.id ASC;`;

const NEXT_PUBLIC_SELECT = `SELECT a.id, a.name, a.slug, a.icon, a.sort_order, ca.note
FROM centers__activities ca
INNER JOIN activities a ON a.id = ca.activity_id
WHERE ca.center_id = $1 AND a.is_active = 1
ORDER BY a.sort_order ASC, a.id ASC;`;

const PREV_SYNC_PREP = `const body = $("panel/activities/sync").first().json.body || {};
const centerId = body.center_id;
const rawIds = body.activity_ids;

const ids = Array.isArray(rawIds)
  ? rawIds.map(Number).filter(Boolean)
  : [];

if (ids.length === 0) {
  return [{ json: { center_id: centerId, activity_id: null } }];
}

return ids.map((id) => ({
  json: { center_id: centerId, activity_id: id }
}));`;

const NEXT_SYNC_PREP = `const body = $("panel/activities/sync").first().json.body || {};
const centerId = body.center_id;
const rawIds = body.activity_ids;

const items = Array.isArray(rawIds) ? rawIds : [];

const normalized = items
  .map((it) => {
    if (it && typeof it === "object") {
      const id = Number(it.id ?? it.activity_id);
      const note = it.note != null ? String(it.note).slice(0, 255) : null;
      return { id, note };
    }
    return { id: Number(it), note: null };
  })
  .filter((it) => Boolean(it.id));

if (normalized.length === 0) {
  return [{
    json: {
      center_id: centerId,
      activity_id: null,
      note: null
    }
  }];
}

return normalized.map((it) => ({
  json: {
    center_id: centerId,
    activity_id: it.id,
    note: it.note
  }
}));`;

const PATCHES = {
  faqs: {
    panel_activities_center: {
      next: { query: NEXT_CENTER_SELECT },
      previous: { query: PREV_CENTER_SELECT }
    },
    panel_activities_sync_prep: {
      next: { jsCode: NEXT_SYNC_PREP },
      previous: { jsCode: PREV_SYNC_PREP }
    },
    panel_activities_sync_insert: {
      next: {
        query: `INSERT IGNORE INTO centers__activities (center_id, activity_id, note)
VALUES ($1, $2, NULLIF($3, ''));`,
        queryReplacement:
          "={{ $json.center_id }},{{ $json.activity_id }},{{ $json.note || '' }}"
      },
      previous: {
        query: `INSERT IGNORE INTO centers__activities (center_id, activity_id)
VALUES ($1, $2);`,
        queryReplacement: "={{ $json.center_id }},{{ $json.activity_id }}"
      }
    }
  },
  sayban2: {
    center_activities_public1: {
      next: { query: NEXT_PUBLIC_SELECT },
      previous: { query: PREV_PUBLIC_SELECT }
    }
  }
};

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

function applyPatch(node, patch) {
  const parameters = { ...node.parameters };
  if (patch.query) parameters.query = patch.query;
  if (patch.jsCode) parameters.jsCode = patch.jsCode;
  if (patch.queryReplacement) {
    parameters.options = {
      ...(node.parameters?.options || {}),
      queryReplacement: patch.queryReplacement
    };
  }
  return { ...node, parameters };
}

const env = readEnv();
const base = (env.N8N_URL || "").replace(/\/$/, "");
const revert = process.argv.includes("--revert");
const direction = revert ? "previous" : "next";

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

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });

for (const [workflowName, nodePatches] of Object.entries(PATCHES)) {
  const summary = (list.data || []).find(w => w.name === workflowName);
  if (!summary) throw new Error(`workflow ${workflowName} not found`);

  const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
    headers: { Cookie: cookie, Accept: "application/json" }
  }).then(r => r.json());
  const wf = detail.data || detail;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `${workflowName}-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
  console.log(`backup: ${path.relative(process.cwd(), backupFile)}`);

  let changed = 0;
  const nodes = wf.nodes.map(node => {
    const patch = nodePatches[node.name]?.[direction];
    if (!patch) return node;
    changed += 1;
    return applyPatch(node, patch);
  });

  const expected = Object.keys(nodePatches).length;
  if (changed !== expected) {
    throw new Error(
      `${workflowName}: patched ${changed} nodes, expected ${expected}`
    );
  }

  const res = await fetch(`${base}/rest/workflows/${summary.id}`, {
    method: "PATCH",
    headers: {
      Cookie: cookie,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ nodes, connections: wf.connections })
  });
  if (!res.ok) {
    throw new Error(
      `${workflowName}: PATCH failed ${res.status} ${await res.text()}`
    );
  }
  console.log(`${workflowName}: patched ${changed} node(s) → ${direction}`);
}

console.log("done");
