/**
 * Enrich GET panel/user/profile with centers.care_domain for the caller's centre.
 *
 *   node scripts/patch-n8n-panel-user-profile-care-domain.mjs [--revert]
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_NAME = "panel users";
const WEBHOOK_NAME = "panel/user/login1";
const LOOKUP_NAME = "panel_user_profile_center";
const FORMAT_NAME = "Code7";
const RESPOND_NAME = "Respond to Webhook2";
const TEMPLATE_SQL = "MySQL6";

const ORIGINAL_FORMAT_JS = `return [
    {
        json: {
            success: true,
            result: {
                role: $input.first().json.jwtPayload.role,
                full_name: $input.first().json.jwtPayload.fullName,
                center_id: $input.first().json.jwtPayload.center
            }
        }
    }
];
`;

const LOOKUP_SQL = `SELECT
  pu.role,
  pu.full_name,
  pu.center_id,
  c.care_domain
FROM panel__users pu
LEFT JOIN centers c ON c.id = pu.center_id
WHERE pu.id = $1
LIMIT 1;`;

const FORMAT_JS = `const jwt = $('${WEBHOOK_NAME}').first().json.jwtPayload || {};
const row = items[0]?.json || {};
return [
  {
    json: {
      success: true,
      result: {
        role: row.role || jwt.role || "",
        full_name: row.full_name || jwt.fullName || "",
        center_id: row.center_id ?? jwt.center ?? null,
        care_domain: row.care_domain ?? null
      }
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
        const idx = line.indexOf("=");
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      })
  );
}

function uid() {
  return crypto.randomBytes(8).toString("hex");
}

const revert = process.argv.includes("--revert");
const env = readEnv();
const base = (env.N8N_URL || "").replace(/\/$/, "");
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

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
fs.writeFileSync(
  path.join(
    backupDir,
    `panel-users-profile-care-domain-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`
  ),
  JSON.stringify(wf, null, 1),
  "utf8"
);

const byName = Object.fromEntries(wf.nodes.map(n => [n.name, n]));
const webhook = byName[WEBHOOK_NAME];
const format = byName[FORMAT_NAME];
const respond = byName[RESPOND_NAME];
const templateSql = byName[TEMPLATE_SQL];
if (!webhook || !format || !respond || !templateSql) {
  throw new Error("required profile nodes missing");
}

if (revert) {
  format.parameters = { ...(format.parameters || {}), jsCode: ORIGINAL_FORMAT_JS };
  wf.nodes = wf.nodes.filter(n => n.name !== LOOKUP_NAME);
  wf.connections[WEBHOOK_NAME] = {
    main: [[{ node: FORMAT_NAME, type: "main", index: 0 }]]
  };
  delete wf.connections[LOOKUP_NAME];
} else {
  let lookup = byName[LOOKUP_NAME];
  if (!lookup) {
    lookup = {
      id: uid(),
      name: LOOKUP_NAME,
      type: templateSql.type,
      typeVersion: templateSql.typeVersion || 2.4,
      position: [
        (format.position?.[0] || 0) - 220,
        format.position?.[1] || 0
      ],
      parameters: {},
      credentials: templateSql.credentials
    };
    wf.nodes.push(lookup);
  }
  lookup.parameters = {
    operation: "executeQuery",
    query: LOOKUP_SQL,
    options: {
      queryReplacement: `={{ $json.jwtPayload.id }}`
    }
  };
  lookup.credentials = templateSql.credentials;

  format.parameters = { ...(format.parameters || {}), jsCode: FORMAT_JS };

  wf.connections[WEBHOOK_NAME] = {
    main: [[{ node: LOOKUP_NAME, type: "main", index: 0 }]]
  };
  wf.connections[LOOKUP_NAME] = {
    main: [[{ node: FORMAT_NAME, type: "main", index: 0 }]]
  };
  wf.connections[FORMAT_NAME] = {
    main: [[{ node: RESPOND_NAME, type: "main", index: 0 }]]
  };
}

const patchRes = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings || {}
  })
});
if (!patchRes.ok) {
  throw new Error(`patch failed: ${patchRes.status} ${await patchRes.text()}`);
}
console.log(
  revert
    ? "reverted panel/user/profile care_domain enrichment"
    : "panel/user/profile now returns centers.care_domain"
);
