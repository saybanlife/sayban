/**
 * Teaches the specialist webhooks about the care & treatment fields added by
 * `scripts/sql/center_care_treatment.sql` (frequency, doctor_kind,
 * visit_interval, and the new `doctor` specialist type).
 *
 * Patches the SQL of existing nodes only — no nodes are added or removed:
 *   faqs    → panel_specialists_list / _insert / _update
 *   sayban2 → center_specialists_public1  (public Center page)
 *
 * Each workflow is backed up to scripts/backup/ before it is written.
 *
 *   node scripts/patch-n8n-care-treatment.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";

const PATCHES = {
  faqs: {
    panel_specialists_list: {
      next: {
        query: `SELECT id, center_id, specialist_type, frequency, doctor_kind,
       visit_interval, days_of_week, is_active, created_at
FROM centers__specialists
WHERE center_id = $1
ORDER BY id ASC;`
      },
      previous: {
        query: `SELECT id, center_id, specialist_type, days_of_week, is_active, created_at
FROM centers__specialists
WHERE center_id = $1
ORDER BY id ASC;`
      }
    },
    panel_specialists_insert: {
      next: {
        query: `INSERT INTO centers__specialists
  (center_id, specialist_type, frequency, doctor_kind, visit_interval, days_of_week, is_active)
VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''), 1);`,
        queryReplacement:
          "={{ $json.body.center_id }},{{ $json.body.specialist_type }}," +
          "{{ $json.body.frequency || '' }},{{ $json.body.doctor_kind || '' }}," +
          "{{ $json.body.visit_interval || '' }},{{ $json.body.days_of_week || '' }}"
      },
      previous: {
        query: `INSERT INTO centers__specialists (center_id, specialist_type, days_of_week, is_active)
VALUES ($1, $2, $3, 1);`,
        queryReplacement:
          "={{ $json.body.center_id }},{{ $json.body.specialist_type }},{{ $json.body.days_of_week }}"
      }
    },
    panel_specialists_update: {
      next: {
        query: `UPDATE centers__specialists
SET specialist_type = $2,
    frequency = NULLIF($3, ''),
    doctor_kind = NULLIF($4, ''),
    visit_interval = NULLIF($5, ''),
    days_of_week = NULLIF($6, ''),
    is_active = COALESCE(NULLIF($7, ''), is_active)
WHERE id = $1;`,
        queryReplacement:
          "={{ $json.body.id }},{{ $json.body.specialist_type }}," +
          "{{ $json.body.frequency || '' }},{{ $json.body.doctor_kind || '' }}," +
          "{{ $json.body.visit_interval || '' }},{{ $json.body.days_of_week || '' }}," +
          "{{ $json.body.is_active ?? '' }}"
      },
      previous: {
        query: `UPDATE centers__specialists
SET specialist_type = $2,
    days_of_week = $3,
    is_active = COALESCE($4, is_active)
WHERE id = $1;`,
        queryReplacement:
          "={{ $json.body.id }},{{ $json.body.specialist_type }},{{ $json.body.days_of_week }},{{ $json.body.is_active }}"
      }
    },
    // Pre-existing bug: a lone numeric replacement is dropped by n8n, so the
    // delete silently matched nothing. The sibling FAQ delete already had the
    // `.toString()` that this one was missing.
    panel_specialists_delete: {
      next: {
        query: "DELETE FROM centers__specialists WHERE id = $1;",
        queryReplacement: "={{ $json.body.id.toString() }}"
      },
      previous: {
        query: "DELETE FROM centers__specialists WHERE id = $1;",
        queryReplacement: "={{ $json.body.id }}"
      }
    }
  },
  sayban2: {
    center_specialists_public1: {
      next: {
        query: `SELECT id, specialist_type, frequency, doctor_kind, visit_interval, days_of_week
FROM centers__specialists
WHERE center_id = $1 AND is_active = 1
ORDER BY id ASC;`
      },
      previous: {
        query: `SELECT id, specialist_type, days_of_week
FROM centers__specialists
WHERE center_id = $1 AND is_active = 1
ORDER BY id ASC;`
      }
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
    const parameters = { ...node.parameters, query: patch.query };
    if (patch.queryReplacement) {
      parameters.options = {
        ...(node.parameters?.options || {}),
        queryReplacement: patch.queryReplacement
      };
    }
    return { ...node, parameters };
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
