/**
 * Fixes `/centers` list filters in the n8n `sayban2` workflow:
 * - availability param was read from `filter.rate.availability` (typo)
 * - `open_now` never matched because `day_of_week` stores Sun/Mon, not 1–7
 * - `bookable` now treats centers with working hours as bookable (visit flow)
 *
 *   node scripts/patch-n8n-centers-filters.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";

const WORKFLOW_NAME = "sayban2";
const SQL_NODE = "MySQL1";

const ORIGINAL_REPLACEMENT =
  "={{ $json.query.subcategory }},{{$json.query.search ||\"\"}},{{$json.query.sort||\"\"}},{{ $json.query.filter?.rate?.value||0 }},{{ $json.query.filter?.rate?.availability||\"\" }},{{ $json.query.category }}";

const PATCHED_REPLACEMENT =
  "={{ $json.query.subcategory }},{{$json.query.search ||\"\"}},{{$json.query.sort||\"\"}},{{ $json.query.min_rate || $json.query.filter?.rate?.value || 0 }},{{ $json.query.availability || $json.query.filter?.availability || \"\" }},{{ $json.query.category }}";

const ORIGINAL_OPEN_NOW =
  "AND wh.day_of_week = DAYOFWEEK(CURDATE())\n                 AND CURTIME() BETWEEN wh.open_time AND wh.close_time";

const PATCHED_OPEN_NOW = `AND wh.day_of_week = CASE DAYOFWEEK(CURDATE())
                     WHEN 1 THEN 'Sun'
                     WHEN 2 THEN 'Mon'
                     WHEN 3 THEN 'Tue'
                     WHEN 4 THEN 'Wed'
                     WHEN 5 THEN 'Thu'
                     WHEN 6 THEN 'Fri'
                     WHEN 7 THEN 'Sat'
                   END
                 AND CURTIME() BETWEEN wh.open_time AND wh.close_time`;

const ORIGINAL_BOOKABLE =
  "WHEN s.is_active = 1\n                 AND sp.price > 0\n                THEN 1";

const PATCHED_BOOKABLE = `WHEN (s.is_active = 1 AND sp.price > 0)
                  OR (wh.is_closed = 0 AND wh.open_time IS NOT NULL AND wh.close_time IS NOT NULL)
                THEN 1`;

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

const list = await fetch(`${base}/rest/workflows?limit=250`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const summary = (list.data || []).find(w => w.name === WORKFLOW_NAME);
if (!summary) throw new Error(`workflow ${WORKFLOW_NAME} not found`);

const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const wf = detail.data || detail;

const node = (wf.nodes || []).find(n => n.name === SQL_NODE);
if (!node) throw new Error(`node ${SQL_NODE} not found`);

const query = String(node.parameters?.query || "");
const replacement = String(node.parameters?.options?.queryReplacement || "");

if (revert) {
  if (!query.includes(PATCHED_OPEN_NOW.split("\n")[0])) {
    throw new Error("already reverted or unexpected SQL shape");
  }
  node.parameters.query = query
    .replace(PATCHED_OPEN_NOW, ORIGINAL_OPEN_NOW)
    .replace(PATCHED_BOOKABLE, ORIGINAL_BOOKABLE);
  node.parameters.options.queryReplacement = ORIGINAL_REPLACEMENT;
} else {
  if (!query.includes("is_open_now") || !query.includes("is_bookable")) {
    throw new Error("unexpected centers SQL on MySQL1");
  }
  if (replacement.includes("filter?.rate?.availability")) {
    node.parameters.options.queryReplacement = PATCHED_REPLACEMENT;
  }
  let nextQuery = query;
  if (nextQuery.includes(ORIGINAL_OPEN_NOW)) {
    nextQuery = nextQuery.replace(ORIGINAL_OPEN_NOW, PATCHED_OPEN_NOW);
  }
  if (nextQuery.includes(ORIGINAL_BOOKABLE)) {
    nextQuery = nextQuery.replace(ORIGINAL_BOOKABLE, PATCHED_BOOKABLE);
  }
  node.parameters.query = nextQuery;
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
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings,
    staticData: wf.staticData
  })
});
if (!patchRes.ok) {
  throw new Error(`patch failed: ${patchRes.status} ${await patchRes.text()}`);
}

console.log(
  revert
    ? "reverted sayban2 /centers filter query"
    : "patched sayban2 /centers filter query + availability param"
);
