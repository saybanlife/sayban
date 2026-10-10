/**
 * Patch reminders dispatch:
 * - IF/Switch after skip: notification → inbox/push; sms → sms; else → finish
 * - Fix send-notif body (isSendNow + isSaveData) so FCM path actually runs
 * - Do not change Bale
 *
 *   node scripts/patch-n8n-reminders-channel-if.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

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

function uuid() {
  return crypto.randomUUID();
}

const PUSH_BODY = `={{ (() => {
  const plan = $('cron_dispatch_route_channel').item.json || {};
  const row = $json || {};
  return JSON.stringify({
    title: row.title || plan.title || 'یادآوری',
    text: row.text || plan.body || '',
    action: '/reminder/',
    notification_type: 'reminder',
    userId: Number(row.user_id || plan.user_id) || 0,
    // Required by notification workflow: true branch → Expand → MySQL tokens → FCM
    isSendNow: true,
    // Save inbox inside send-notif (reminder inbox SQL becomes pass-through)
    isSaveData: true
  });
})() }}`;

const INBOX_PASS_QUERY = `SELECT $6 AS delivery_id, $4 AS final_action, $5 AS channel,
       $1 AS user_id, $2 AS title, $3 AS text;`;

const INBOX_PASS_PARAMS = `={{ (() => { const j=$('cron_dispatch_route_channel').item.json; return [j.user_id, j.title, j.body, j.final_action, j.channel, j.delivery_id]; })() }}`;

const LINK_INBOX_QUERY = `UPDATE reminder_deliveries d
SET d.inbox_notification_id = (
  SELECT n.id FROM users__notification n
  WHERE n.userId = $1 AND n.title = $2 AND n.notification_type = 'reminder'
  ORDER BY n.id DESC LIMIT 1
)
WHERE d.id = $3 AND d.channel = 'notification';
SELECT d.id AS delivery_id, d.inbox_notification_id, d.status,
       $4 AS final_action, 'notification' AS channel, $1 AS user_id, $2 AS title, $5 AS text
FROM reminder_deliveries d WHERE d.id = $3 LIMIT 1;`;

const LINK_INBOX_PARAMS = `={{ (() => {
  const plan = $('cron_dispatch_route_channel').item.json || {};
  const row = $json || {};
  return [
    Number(row.user_id || plan.user_id) || 0,
    row.title || plan.title || '',
    Number(row.delivery_id || plan.delivery_id) || 0,
    row.final_action || plan.final_action || 'send',
    row.text || plan.body || ''
  ];
})() }}`;

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
const summary = (list.data || []).find(w => w.name === "reminders");
if (!summary) throw new Error("reminders workflow missing");

const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
  headers: { Cookie: cookie }
}).then(r => r.json());
const wf = detail.data || detail;

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(
  backupDir,
  `reminders-channel-if-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(wf, null, 1), "utf8");
console.log("backup", path.relative(process.cwd(), backupFile));

const nodes = wf.nodes || [];
const connections = wf.connections || {};
const byName = name => nodes.find(n => n.name === name);

const push = byName("cron_dispatch_push");
const sms = byName("cron_dispatch_sms");
const inbox = byName("cron_dispatch_inbox");
const finish = byName("cron_dispatch_finish");
const skip = byName("cron_dispatch_skip_sql");
if (!push || !sms || !inbox || !finish || !skip) {
  throw new Error("required dispatch nodes missing");
}

// Keep SMS on reminder_templates.template (never reminders.text / body)
sms.parameters = {
  ...sms.parameters,
  method: "POST",
  url: "https://sayban.darkube.ir/webhook/users/sms",
  sendBody: true,
  specifyBody: "json",
  jsonBody: `={{ JSON.stringify({ id: $('cron_dispatch_route_channel').item.json.user_id, template: $('cron_dispatch_route_channel').item.json.sms_template }) }}`,
  options: { ...(sms.parameters?.options || {}), timeout: 15000 }
};
sms.onError = "continueRegularOutput";

// 1) Fix push payload for send-notif contract
push.parameters = {
  ...push.parameters,
  method: "POST",
  url: "https://sayban.darkube.ir/webhook/send-notif",
  sendBody: true,
  specifyBody: "json",
  jsonBody: PUSH_BODY,
  options: { ...(push.parameters?.options || {}), timeout: 15000 }
};
push.onError = "continueRegularOutput";

// 2) Inbox becomes pass-through (send-notif Save writes users__notification)
inbox.parameters = {
  ...inbox.parameters,
  operation: "executeQuery",
  query: INBOX_PASS_QUERY,
  options: { queryReplacement: INBOX_PASS_PARAMS }
};

// 3) Add IF: channel === notification (true) / else (false)
const ifNodeName = "cron_dispatch_channel_if";
let ifNode = byName(ifNodeName);
if (!ifNode) {
  const skipPos = skip.position || [0, 0];
  ifNode = {
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: "",
          typeValidation: "strict",
          version: 2
        },
        conditions: [
          {
            id: uuid(),
            leftValue:
              "={{ $('cron_dispatch_route_channel').item.json.channel }}",
            rightValue: "notification",
            operator: {
              type: "string",
              operation: "equals"
            }
          }
        ],
        combinator: "and"
      },
      options: {}
    },
    type: "n8n-nodes-base.if",
    typeVersion: 2.2,
    position: [skipPos[0] + 220, skipPos[1]],
    id: uuid(),
    name: ifNodeName
  };
  nodes.push(ifNode);
}

// 4) Add IF: channel === sms
const ifSmsName = "cron_dispatch_sms_if";
let ifSms = byName(ifSmsName);
if (!ifSms) {
  const ifPos = ifNode.position || [0, 0];
  ifSms = {
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: "",
          typeValidation: "strict",
          version: 2
        },
        conditions: [
          {
            id: uuid(),
            leftValue:
              "={{ $('cron_dispatch_route_channel').item.json.channel }}",
            rightValue: "sms",
            operator: {
              type: "string",
              operation: "equals"
            }
          },
          {
            id: uuid(),
            leftValue:
              "={{ $('cron_dispatch_route_channel').item.json.final_action }}",
            rightValue: "send",
            operator: {
              type: "string",
              operation: "equals"
            }
          }
        ],
        combinator: "and"
      },
      options: {}
    },
    type: "n8n-nodes-base.if",
    typeVersion: 2.2,
    position: [ifPos[0] + 40, ifPos[1] + 220],
    id: uuid(),
    name: ifSmsName
  };
  nodes.push(ifSms);
}

// 5) Link inbox id after successful notification save/push
const linkName = "cron_dispatch_link_inbox";
let linkInbox = byName(linkName);
if (!linkInbox) {
  const pushPos = push.position || [0, 0];
  linkInbox = {
    parameters: {
      operation: "executeQuery",
      query: LINK_INBOX_QUERY,
      options: { queryReplacement: LINK_INBOX_PARAMS }
    },
    type: "n8n-nodes-base.mySql",
    typeVersion: 2.4,
    position: [pushPos[0] + 220, pushPos[1]],
    id: uuid(),
    name: linkName,
    credentials: inbox.credentials
  };
  nodes.push(linkInbox);
}

// 6) Rewire connections
// skip → channel_if
// channel_if true → inbox → push → link_inbox → finish
// channel_if false → sms_if
// sms_if true → sms → finish
// sms_if false → finish
connections.cron_dispatch_skip_sql = {
  main: [[{ node: ifNodeName, type: "main", index: 0 }]]
};
connections[ifNodeName] = {
  main: [
    [{ node: "cron_dispatch_inbox", type: "main", index: 0 }],
    [{ node: ifSmsName, type: "main", index: 0 }]
  ]
};
connections.cron_dispatch_inbox = {
  main: [[{ node: "cron_dispatch_push", type: "main", index: 0 }]]
};
connections.cron_dispatch_push = {
  main: [[{ node: linkName, type: "main", index: 0 }]]
};
connections[linkName] = {
  main: [[{ node: "cron_dispatch_finish", type: "main", index: 0 }]]
};
connections[ifSmsName] = {
  main: [
    [{ node: "cron_dispatch_sms", type: "main", index: 0 }],
    [{ node: "cron_dispatch_finish", type: "main", index: 0 }]
  ]
};
connections.cron_dispatch_sms = {
  main: [[{ node: "cron_dispatch_finish", type: "main", index: 0 }]]
};

// Gate notification path on final_action=send as well (skip → false branch)
ifNode.parameters = {
  conditions: {
    options: {
      caseSensitive: true,
      leftValue: "",
      typeValidation: "strict",
      version: 2
    },
    conditions: [
      {
        id: uuid(),
        leftValue: "={{ $('cron_dispatch_route_channel').item.json.channel }}",
        rightValue: "notification",
        operator: { type: "string", operation: "equals" }
      },
      {
        id: uuid(),
        leftValue:
          "={{ $('cron_dispatch_route_channel').item.json.final_action }}",
        rightValue: "send",
        operator: { type: "string", operation: "equals" }
      }
    ],
    combinator: "and"
  },
  options: {}
};

wf.nodes = nodes;
wf.connections = connections;

const put = await fetch(`${base}/rest/workflows/${summary.id}`, {
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
    staticData: wf.staticData ?? null,
    active: true,
    ...(wf.versionId ? { versionId: wf.versionId } : {})
  })
});
if (!put.ok) {
  const t = await put.text();
  throw new Error(`patch failed ${put.status}: ${t.slice(0, 400)}`);
}
console.log("patched reminders channel IF + notification body ok");
