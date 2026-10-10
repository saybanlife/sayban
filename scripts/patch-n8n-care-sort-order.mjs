/**
 * Patch faqs + sayban2 so care/specialist order is read/written via sort_order.
 * Backs up each workflow under scripts/backup/ before PATCH.
 *
 *   node scripts/patch-n8n-care-sort-order.mjs
 *   node scripts/patch-n8n-care-sort-order.mjs --revert
 */
import fs from "node:fs";
import path from "node:path";

const SYNC_PREP_NEXT = `const body = $("panel/care-items/sync").first().json.body || {};
const centerId = body.center_id;
const rawItems = body.items;

// items: [{ id: 1, has_it: true, note: "...", sort_order: 0 }, ...]
const items = Array.isArray(rawItems) ? rawItems : [];

const normalized = items
  .map((it, index) => ({
    care_item_id: Number(it.id ?? it.care_item_id),
    has_it: it.has_it ? 1 : 0,
    note: it.note != null ? String(it.note).slice(0, 255) : null,
    sort_order:
      it.sort_order != null && Number.isFinite(Number(it.sort_order))
        ? Number(it.sort_order)
        : index
  }))
  .filter((it) => Boolean(it.care_item_id));

if (normalized.length === 0) {
  return [{ json: { center_id: centerId, care_item_id: null, has_it: 0, note: null, sort_order: 0 } }];
}

return normalized.map((it) => ({
  json: {
    center_id: centerId,
    care_item_id: it.care_item_id,
    has_it: it.has_it,
    note: it.note,
    sort_order: it.sort_order
  }
}));
`;

const SYNC_PREP_PREV = `const body = $("panel/care-items/sync").first().json.body || {};
const centerId = body.center_id;
const rawItems = body.items;

// items: [{ id: 1, has_it: true, note: "..." }, ...]
const items = Array.isArray(rawItems) ? rawItems : [];

const normalized = items
  .map((it) => ({
    care_item_id: Number(it.id ?? it.care_item_id),
    has_it: it.has_it ? 1 : 0,
    note: it.note != null ? String(it.note).slice(0, 255) : null
  }))
  .filter((it) => Boolean(it.care_item_id));

if (normalized.length === 0) {
  return [{ json: { center_id: centerId, care_item_id: null, has_it: 0, note: null } }];
}

return normalized.map((it) => ({
  json: {
    center_id: centerId,
    care_item_id: it.care_item_id,
    has_it: it.has_it,
    note: it.note
  }
}));
`;

const PATCHES = {
  faqs: {
    panel_care_items_center: {
      next: {
        query: `SELECT ci.id, ci.name, ci.slug,
       COALESCE(v.sort_order, ci.sort_order) AS sort_order,
       COALESCE(v.has_it, 0) AS has_it, v.note
FROM centers__care_items ci
LEFT JOIN centers__care_item_values v
  ON v.care_item_id = ci.id AND v.center_id = $1
WHERE ci.is_active = 1
ORDER BY COALESCE(v.sort_order, ci.sort_order) ASC, ci.id ASC;`
      },
      previous: {
        query: `SELECT ci.id, ci.name, ci.slug, ci.sort_order,
       COALESCE(v.has_it, 0) AS has_it, v.note
FROM centers__care_items ci
LEFT JOIN centers__care_item_values v
  ON v.care_item_id = ci.id AND v.center_id = $1
WHERE ci.is_active = 1
ORDER BY ci.sort_order ASC, ci.id ASC;`
      }
    },
    panel_care_items_sync_prep: {
      next: { jsCode: SYNC_PREP_NEXT },
      previous: { jsCode: SYNC_PREP_PREV }
    },
    panel_care_items_sync_insert: {
      next: {
        query: `INSERT INTO centers__care_item_values (center_id, care_item_id, has_it, note, sort_order)
VALUES ($1, $2, $3, $4, $5)
ON DUPLICATE KEY UPDATE has_it = VALUES(has_it), note = VALUES(note), sort_order = VALUES(sort_order);`,
        queryReplacement:
          "={{ $json.center_id }},{{ $json.care_item_id }},{{ $json.has_it }},{{ $json.note }},{{ $json.sort_order }}"
      },
      previous: {
        query: `INSERT INTO centers__care_item_values (center_id, care_item_id, has_it, note)
VALUES ($1, $2, $3, $4)
ON DUPLICATE KEY UPDATE has_it = VALUES(has_it), note = VALUES(note);`,
        queryReplacement:
          "={{ $json.center_id }},{{ $json.care_item_id }},{{ $json.has_it }},{{ $json.note }}"
      }
    },
    panel_specialists_list: {
      next: {
        query: `SELECT id, center_id, specialist_type, frequency, doctor_kind,
       visit_interval, days_of_week, is_active, sort_order, created_at
FROM centers__specialists
WHERE center_id = $1
ORDER BY sort_order ASC, id ASC;`
      },
      previous: {
        query: `SELECT id, center_id, specialist_type, frequency, doctor_kind,
       visit_interval, days_of_week, is_active, created_at
FROM centers__specialists
WHERE center_id = $1
ORDER BY id ASC;`
      }
    },
    panel_specialists_insert: {
      next: {
        query: `INSERT INTO centers__specialists
  (center_id, specialist_type, frequency, doctor_kind, visit_interval, days_of_week, is_active, sort_order)
VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''), 1, COALESCE(NULLIF($7, ''), 0));`,
        queryReplacement:
          "={{ $json.body.center_id }},{{ $json.body.specialist_type }}," +
          "{{ $json.body.frequency || '' }},{{ $json.body.doctor_kind || '' }}," +
          "{{ $json.body.visit_interval || '' }},{{ $json.body.days_of_week || '' }}," +
          "{{ $json.body.sort_order ?? '' }}"
      },
      previous: {
        query: `INSERT INTO centers__specialists
  (center_id, specialist_type, frequency, doctor_kind, visit_interval, days_of_week, is_active)
VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, ''), NULLIF($6, ''), 1);`,
        queryReplacement:
          "={{ $json.body.center_id }},{{ $json.body.specialist_type }}," +
          "{{ $json.body.frequency || '' }},{{ $json.body.doctor_kind || '' }}," +
          "{{ $json.body.visit_interval || '' }},{{ $json.body.days_of_week || '' }}"
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
    is_active = COALESCE(NULLIF($7, ''), is_active),
    sort_order = COALESCE(NULLIF($8, ''), sort_order)
WHERE id = $1;`,
        queryReplacement:
          "={{ $json.body.id }},{{ $json.body.specialist_type }}," +
          "{{ $json.body.frequency || '' }},{{ $json.body.doctor_kind || '' }}," +
          "{{ $json.body.visit_interval || '' }},{{ $json.body.days_of_week || '' }}," +
          "{{ $json.body.is_active ?? '' }},{{ $json.body.sort_order ?? '' }}"
      },
      previous: {
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
      }
    }
  },
  sayban2: {
    center_care_items_public1: {
      next: {
        query: `SELECT ci.id, ci.name, ci.slug, v.has_it, v.note,
       COALESCE(v.sort_order, ci.sort_order) AS sort_order
FROM centers__care_items ci
INNER JOIN centers__care_item_values v ON v.care_item_id = ci.id
WHERE v.center_id = $1 AND v.has_it = 1 AND ci.is_active = 1
ORDER BY COALESCE(v.sort_order, ci.sort_order) ASC, ci.id ASC;`
      },
      previous: {
        query: `SELECT ci.id, ci.name, ci.slug, v.has_it, v.note
FROM centers__care_items ci
INNER JOIN centers__care_item_values v ON v.care_item_id = ci.id
WHERE v.center_id = $1 AND v.has_it = 1 AND ci.is_active = 1
ORDER BY ci.sort_order ASC, ci.id ASC;`
      }
    },
    center_specialists_public1: {
      next: {
        query: `SELECT id, specialist_type, frequency, doctor_kind, visit_interval, days_of_week, sort_order
FROM centers__specialists
WHERE center_id = $1 AND is_active = 1
ORDER BY sort_order ASC, id ASC;`
      },
      previous: {
        query: `SELECT id, specialist_type, frequency, doctor_kind, visit_interval, days_of_week
FROM centers__specialists
WHERE center_id = $1 AND is_active = 1
ORDER BY id ASC;`
      }
    },
    center_care_items_public: {
      next: {
        query: `SELECT ci.id, ci.name, ci.slug, v.has_it, v.note,
       COALESCE(v.sort_order, ci.sort_order) AS sort_order
FROM centers__care_items ci
INNER JOIN centers__care_item_values v ON v.care_item_id = ci.id
WHERE v.center_id = $1 AND v.has_it = 1 AND ci.is_active = 1
ORDER BY COALESCE(v.sort_order, ci.sort_order) ASC, ci.id ASC;`
      },
      previous: {
        query: `SELECT ci.id, ci.name, ci.slug, v.has_it, v.note
FROM centers__care_items ci
INNER JOIN centers__care_item_values v ON v.care_item_id = ci.id
WHERE v.center_id = $1 AND v.has_it = 1 AND ci.is_active = 1
ORDER BY ci.sort_order ASC, ci.id ASC;`
      }
    },
    center_specialists_public: {
      next: {
        query: `SELECT id, specialist_type, frequency, doctor_kind, visit_interval, days_of_week, sort_order
FROM centers__specialists
WHERE center_id = $1 AND is_active = 1
ORDER BY sort_order ASC, id ASC;`
      },
      previous: {
        query: `SELECT id, specialist_type, frequency, doctor_kind, visit_interval, days_of_week
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
  const backupFile = path.join(backupDir, `${workflowName}-care-sort-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
  console.log(`backup: ${path.relative(process.cwd(), backupFile)}`);

  let changed = 0;
  const nodes = wf.nodes.map(node => {
    const patch = nodePatches[node.name]?.[direction];
    if (!patch) return node;
    changed += 1;
    const parameters = { ...node.parameters };
    if (patch.query != null) parameters.query = patch.query;
    if (patch.jsCode != null) {
      parameters.jsCode = patch.jsCode;
    }
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
      `${workflowName}: patched ${changed} nodes, expected ${expected}. Missing: ${Object.keys(
        nodePatches
      )
        .filter(name => !nodes.some(n => n.name === name && nodePatches[n.name]))
        .join(", ")}`
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

console.log("patch-n8n-care-sort-order done");
