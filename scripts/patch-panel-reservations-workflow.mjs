/**
 * Wire /panel/reservations to the enriched reservation chain (user + patient JOIN)
 * and route responses to the correct webhook respond node.
 */
import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKFLOW_ID = "66g05UtTt6agbsIR";

function loadEnv(path) {
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter(l => l && !l.startsWith("#"))
      .map(line => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1)];
      })
  );
}

const CODE49_JS = `const webhook = $input.first().json;
const query = webhook.query || {};
const page = Math.max(Number.parseInt(query.page || '1', 10), 1);
const limit = Math.min(
  Math.max(Number.parseInt(query.limit || '20', 10), 1),
  100
);
const offset = (page - 1) * limit;

return [
  {
    json: {
      page,
      limit,
      offset,
      center_id: query.center_id || 'no',
      state: query.state || 'reservations_all',
      search: query.search || 'no'
    }
  }
];`;

const MYSQL59_REPLACEMENT =
  "={{ $('Code49').first().json.center_id || 'no' }},{{ $('Code49').first().json.state || 'reservations_all' }},{{ $('Code49').first().json.search || 'no' }}";

async function main() {
  const env = loadEnv(
    join(__dirname, "..", ".cursor", "sayban-ops", "secrets", "n8n_sayban.env")
  );
  const base = env.N8N_URL.replace(/\/$/, "");

  const loginRes = await fetch(`${base}/rest/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      emailOrLdapLoginId: env.N8N_USER,
      password: env.N8N_PASSWORD
    })
  });
  if (!loginRes.ok) {
    throw new Error(`n8n login failed: ${loginRes.status}`);
  }
  const cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];

  const wfRes = await fetch(`${base}/rest/workflows/${WORKFLOW_ID}`, {
    headers: { Cookie: cookie }
  });
  if (!wfRes.ok) {
    throw new Error(`fetch workflow failed: ${wfRes.status}`);
  }
  const workflow = (await wfRes.json()).data;

  const code49 = workflow.nodes.find(n => n.name === "Code49");
  const mysql59 = workflow.nodes.find(n => n.name === "MySQL59");
  if (!code49 || !mysql59) {
    throw new Error("Code49 or MySQL59 node missing");
  }

  code49.parameters.jsCode = CODE49_JS;
  mysql59.parameters.options = mysql59.parameters.options || {};
  mysql59.parameters.options.queryReplacement = MYSQL59_REPLACEMENT;

  const routeNodeName = "Route panel reservations respond";
  let routeNode = workflow.nodes.find(n => n.name === routeNodeName);
  if (!routeNode) {
    const code48 = workflow.nodes.find(n => n.name === "Code48");
    const pos = code48?.position || [-4400, -4160];
    routeNode = {
      parameters: {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: "",
            typeValidation: "loose",
            version: 2
          },
          conditions: [
            {
              id: randomUUID(),
              leftValue: "={{ $('reservations').isExecuted }}",
              rightValue: "",
              operator: {
                type: "boolean",
                operation: "true",
                singleValue: true
              }
            }
          ],
          combinator: "and"
        },
        options: {}
      },
      type: "n8n-nodes-base.if",
      typeVersion: 2.2,
      position: [pos[0] + 160, pos[1]],
      id: randomUUID(),
      name: routeNodeName
    };
    workflow.nodes.push(routeNode);
  }

  workflow.connections.reservations = {
    main: [[{ node: "Code49", type: "main", index: 0 }]]
  };

  workflow.connections.Code48 = {
    main: [[{ node: routeNodeName, type: "main", index: 0 }]]
  };

  workflow.connections[routeNodeName] = {
    main: [
      [{ node: "Respond to Webhook27", type: "main", index: 0 }],
      [{ node: "Respond to Webhook79", type: "main", index: 0 }]
    ]
  };

  const putRes = await fetch(`${base}/rest/workflows/${WORKFLOW_ID}`, {
    method: "PATCH",
    headers: {
      Cookie: cookie,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: workflow.name,
      nodes: workflow.nodes,
      connections: workflow.connections,
      settings: workflow.settings,
      staticData: workflow.staticData
    })
  });

  if (!putRes.ok) {
    const text = await putRes.text();
    throw new Error(`workflow PUT failed: ${putRes.status} ${text.slice(0, 500)}`);
  }

  console.log("Patched panel/reservations workflow:");
  console.log("- reservations -> Code49 (enriched chain with patient JOIN)");
  console.log("- MySQL59 filters now read from Code49 query passthrough");
  console.log("- Code48 -> route node -> Respond27 (reservations) or Respond79 (Reservation3)");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
