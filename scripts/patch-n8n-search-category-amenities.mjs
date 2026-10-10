/**
 * Extends Home `/search` (n8n sayban2 → MySQL2) so keyword matches:
 * - center category name (e.g. «اعزام پرستار»)
 * - amenity / امکانات name (e.g. «پرستار شبانه‌روزی»)
 * in addition to existing name/address/subcategory/service/tag/contact matches.
 *
 *   node scripts/patch-n8n-search-category-amenities.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";

const WORKFLOW_ID = "UiZ8l9NtiYADSWdF";
const SQL_NODE = "MySQL2";

const ORIGINAL_QUERY =
  "SELECT DISTINCT MD5(c.id) as id, c.name , c.address, c.area, c.latitude, c.longitude, c.main_image, c.rating_avg FROM centers c LEFT JOIN centers__subcategories sc ON c.subcategory_id = sc.id LEFT JOIN centers__categories cat ON sc.category_id = cat.id LEFT JOIN centers__contacts ct ON ct.center_id = c.id LEFT JOIN centers__tags ctg ON ctg.center_id = c.id LEFT JOIN tags t ON t.id = ctg.tag_id LEFT JOIN centers__services s ON s.center_id = c.id LEFT JOIN centers__service_prices sp ON sp.service_id = s.id WHERE c.deleted_at IS NULL AND( c.name LIKE CONCAT('%', $1, '%') OR c.address LIKE CONCAT('%', $1, '%') OR c.area LIKE CONCAT('%', $1, '%') OR sc.name LIKE CONCAT('%', $1, '%') OR s.name LIKE CONCAT('%', $1, '%') OR t.name LIKE CONCAT('%', $1, '%') OR ct.value LIKE CONCAT('%', $1, '%') ) ORDER BY c.rating_avg DESC; ";

const PATCHED_QUERY =
  "SELECT DISTINCT MD5(c.id) as id, c.name , c.address, c.area, c.latitude, c.longitude, c.main_image, c.rating_avg FROM centers c LEFT JOIN centers__subcategories sc ON c.subcategory_id = sc.id LEFT JOIN centers__categories cat ON sc.category_id = cat.id LEFT JOIN centers__contacts ct ON ct.center_id = c.id LEFT JOIN centers__tags ctg ON ctg.center_id = c.id LEFT JOIN tags t ON t.id = ctg.tag_id LEFT JOIN centers__services s ON s.center_id = c.id LEFT JOIN centers__service_prices sp ON sp.service_id = s.id LEFT JOIN centers__amenities cam ON cam.center_id = c.id LEFT JOIN amenities a ON a.id = cam.amenity_id AND a.is_active = 1 WHERE c.deleted_at IS NULL AND( c.name LIKE CONCAT('%', $1, '%') OR c.address LIKE CONCAT('%', $1, '%') OR c.area LIKE CONCAT('%', $1, '%') OR sc.name LIKE CONCAT('%', $1, '%') OR cat.name LIKE CONCAT('%', $1, '%') OR s.name LIKE CONCAT('%', $1, '%') OR t.name LIKE CONCAT('%', $1, '%') OR ct.value LIKE CONCAT('%', $1, '%') OR a.name LIKE CONCAT('%', $1, '%') ) ORDER BY c.rating_avg DESC; ";

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

const detail = await fetch(`${base}/rest/workflows/${WORKFLOW_ID}`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const wf = detail.data || detail;

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
fs.writeFileSync(
  path.join(
    backupDir,
    `sayban2-search-mysql2-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`
  ),
  JSON.stringify(wf, null, 1),
  "utf8"
);

const nodes = JSON.parse(JSON.stringify(wf.nodes));
const mysql = nodes.find(n => n.name === SQL_NODE);
if (!mysql) throw new Error(`${SQL_NODE} missing`);

const current = String(mysql.parameters?.query || "");
const target = revert ? ORIGINAL_QUERY : PATCHED_QUERY;

if (!revert) {
  const already =
    current.includes("cat.name LIKE") && current.includes("centers__amenities");
  if (already && current.includes("a.name LIKE")) {
    console.log("already patched");
    process.exit(0);
  }
}

mysql.parameters = {
  ...mysql.parameters,
  operation: "executeQuery",
  query: target,
  options: {
    ...(mysql.parameters?.options || {}),
    queryReplacement: "={{ $json.body.keyword }}"
  }
};

const patch = await fetch(`${base}/rest/workflows/${WORKFLOW_ID}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: wf.name,
    nodes,
    connections: wf.connections,
    settings: wf.settings || {},
    staticData: wf.staticData,
    active: true
  })
});
if (!patch.ok) throw new Error(`patch ${patch.status} ${await patch.text()}`);
console.log(
  revert
    ? "reverted /search MySQL2 to previous keyword fields"
    : "patched /search MySQL2: +category name +amenity name"
);
