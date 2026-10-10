/**
 * Print one execution's per-node input/output, for debugging webhook queries.
 *
 *   node scripts/n8n-execution-node.mjs <executionId> [nodeNameFilter]
 *
 * n8n stores execution data either as a nested object or as a "flatted" string,
 * depending on version; both are handled here.
 */
import fs from "node:fs";
import path from "node:path";

const env = Object.fromEntries(
  fs
    .readFileSync(
      path.join(process.cwd(), ".cursor/sayban-ops/secrets/n8n_sayban.env"),
      "utf8"
    )
    .split(/\r?\n/)
    .filter(l => l.trim() && !l.trim().startsWith("#"))
    .map(l => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const base = (env.N8N_URL || "").replace(/\/$/, "");
const id = process.argv[2];
const filter = (process.argv[3] || "").toLowerCase();
if (!id) {
  console.error("Usage: node scripts/n8n-execution-node.mjs <id> [nodeFilter]");
  process.exit(2);
}

const login = await fetch(`${base}/rest/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    emailOrLdapLoginId: env.N8N_USER,
    password: env.N8N_PASSWORD
  })
});
if (!login.ok) throw new Error(`n8n login failed: ${login.status}`);
const cookie = (login.headers.get("set-cookie") || "").split(";")[0];

const detail = await fetch(`${base}/rest/executions/${id}`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());

let data = detail?.data?.data ?? detail?.data;
if (typeof data === "string") {
  try {
    const parsed = JSON.parse(data);
    // "flatted" arrays: index 0 holds the root object with string-index refs.
    data = Array.isArray(parsed) ? hydrate(parsed) : parsed;
  } catch (e) {
    console.error("could not parse execution data:", e.message);
    process.exit(1);
  }
}

function hydrate(arr) {
  const seen = new Map();
  const walk = value => {
    if (typeof value === "string" && /^\d+$/.test(value)) {
      const idx = Number(value);
      if (idx < arr.length) {
        if (seen.has(idx)) return seen.get(idx);
        const target = arr[idx];
        if (target && typeof target === "object") {
          const shell = Array.isArray(target) ? [] : {};
          seen.set(idx, shell);
          for (const [k, v] of Object.entries(target)) shell[k] = walk(v);
          return shell;
        }
        return target;
      }
    }
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([k, v]) => [k, walk(v)])
      );
    }
    return value;
  };
  return walk("0");
}

const runData = data?.resultData?.runData || {};
console.log(`nodes: ${Object.keys(runData).join(", ") || "(none)"}`);

for (const [name, runs] of Object.entries(runData)) {
  if (filter && !name.toLowerCase().includes(filter)) continue;
  for (const run of runs || []) {
    const out = run?.data?.main?.[0]?.map(i => i?.json);
    console.log(
      `\n=== ${name} ===\n${JSON.stringify(
        { error: run?.error?.message, output: out },
        null,
        1
      ).slice(0, 4000)}`
    );
  }
}
