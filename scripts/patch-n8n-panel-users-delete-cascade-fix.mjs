/**
 * Split users_delete_cascade into ordered single-statement nodes (MySQL node
 * does not reliably execute multi-statement scripts).
 *
 *   node scripts/patch-n8n-panel-users-delete-cascade-fix.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW_ID = "A9UoaMCH5ThcTbG5";
const AUTH = "users_delete_auth";
const OLD_SQL = "users_delete_cascade";
const VERIFY = "users_delete_verify";
const FORMAT = "users_delete_format";
const RESPOND = "users_delete_respond";

const STEPS = [
  {
    name: "users_delete_reviews_reply",
    query: `DELETE p FROM centers__reply p
INNER JOIN centers__reviews r ON r.id = p.review_id
WHERE r.user_id = $1;`
  },
  {
    name: "users_delete_reviews",
    query: "DELETE FROM centers__reviews WHERE user_id = $1;"
  },
  {
    name: "users_delete_questionnaires",
    query: `DELETE rq FROM reservations__questionnaires rq
INNER JOIN reservations r ON r.id = rq.reservation_id
WHERE r.user_id = $1;`
  },
  {
    name: "users_delete_reservations",
    query: "DELETE FROM reservations WHERE user_id = $1;"
  },
  {
    name: "users_delete_notification",
    query: "DELETE FROM `users__notification` WHERE `userId` = $1;"
  },
  {
    name: "users_delete_patient",
    query: "DELETE FROM users__patient WHERE user_id = $1;"
  },
  {
    name: "users_delete_addresses",
    query: "DELETE FROM users__addresses WHERE user_id = $1;"
  },
  {
    name: "users_delete_user",
    query: "DELETE FROM users WHERE id = $1;"
  }
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

const detail = await fetch(`${base}/rest/workflows/${WORKFLOW_ID}`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const wf = detail.data || detail;

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
fs.writeFileSync(
  path.join(
    backupDir,
    `panel-user-delete-cascade-fix-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  ),
  JSON.stringify(wf, null, 1),
  "utf8"
);

let nodes = [...wf.nodes];
const connections = JSON.parse(JSON.stringify(wf.connections));

const old = nodes.find(n => n.name === OLD_SQL);
if (!old) {
  console.log("users_delete_cascade not found; skip");
  process.exit(0);
}
if (nodes.some(n => n.name === STEPS[0].name)) {
  console.log("cascade fix already applied");
  process.exit(0);
}

const sqlTemplate = old;
const pos = old.position || [440, 0];
nodes = nodes.map(n => (n.name === OLD_SQL ? { ...n, disabled: true } : n));

STEPS.forEach((step, i) => {
  nodes.push({
    parameters: {
      operation: "executeQuery",
      query: step.query,
      options: {
        queryReplacement:
          "={{ $('users_delete_auth').first().json.user_id.toString() }}"
      }
    },
    type: "n8n-nodes-base.mySql",
    typeVersion: sqlTemplate.typeVersion,
    position: [pos[0] + i * 220, pos[1]],
    id: crypto.randomUUID(),
    name: step.name,
    alwaysOutputData: true,
    credentials: JSON.parse(JSON.stringify(sqlTemplate.credentials || {}))
  });
});

delete connections[AUTH];
connections[AUTH] = {
  main: [[{ node: STEPS[0].name, type: "main", index: 0 }]]
};
for (let i = 0; i < STEPS.length - 1; i += 1) {
  connections[STEPS[i].name] = {
    main: [[{ node: STEPS[i + 1].name, type: "main", index: 0 }]]
  };
}
connections[STEPS[STEPS.length - 1].name] = {
  main: [[{ node: VERIFY, type: "main", index: 0 }]]
};

const patchRes = await fetch(`${base}/rest/workflows/${WORKFLOW_ID}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
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
console.log("split users delete cascade into", STEPS.length, "SQL nodes");
