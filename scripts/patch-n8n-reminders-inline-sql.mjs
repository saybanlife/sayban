/**
 * Fix materialize apply: n8n MySQL executeQuery does not bind ? when query
 * itself is an expression. Emit fully-inlined SQL from Code nodes instead.
 *
 *   node scripts/patch-n8n-reminders-inline-sql.mjs
 */
import fs from "node:fs";
import path from "node:path";

function readEnv() {
  const envPath = path.join(
    process.cwd(),
    ".cursor/sayban-ops/secrets/n8n_sayban.env"
  );
  return Object.fromEntries(
    fs
      .readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith("#"))
      .map((line) => {
        const idx = line.indexOf("=");
        return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
      })
  );
}

const SQL_BUILD = `function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return "'" + String(v).replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'") + "'";
}
const data = items[0].json || {};
const slots = data.slots || [];
const rid = Number(data.reminder_id);
const uid = Number(data.user_id);
const ver = Number(data.version) || 1;
if (!rid) return [];
const statements = [];
statements.push({
  query: 'UPDATE reminders SET next_materialize_at = ' + esc(data.next_materialize_at) + ' WHERE id = ' + rid
});
for (const s of slots) {
  statements.push({
    query: 'INSERT IGNORE INTO reminder_occurrences ' +
      '(reminder_id, user_id, reminder_version, fire_at, kind, pre_offset_minutes, title, body, channels, status) VALUES (' +
      [rid, uid, ver, esc(s.fire_at), esc(s.kind), s.pre_offset_minutes == null ? 'NULL' : Number(s.pre_offset_minutes),
       esc(s.title), esc(s.body), esc(s.channels), esc('pending')].join(',') + ')'
  });
}
statements.push({
  query: "INSERT INTO reminder_deliveries " +
    "(occurrence_id, reminder_id, user_id, channel, status, unit_cost) " +
    "SELECT o.id, o.reminder_id, o.user_id, p.channel, 'pending', p.unit_price " +
    "FROM reminder_occurrences o " +
    "JOIN reminder_channel_prices p ON p.active = 1 " +
    "LEFT JOIN reminder_deliveries d ON d.occurrence_id = o.id AND d.channel = p.channel " +
    "WHERE o.reminder_id = " + rid + " AND o.reminder_version = " + ver + " AND d.id IS NULL " +
    "AND ((p.channel = 'notification' AND o.channels LIKE '%notification%') " +
    "OR (p.channel = 'sms' AND o.channels LIKE '%sms%') " +
    "OR (p.channel = 'bale' AND o.channels LIKE '%bale%'))"
});
return statements.map(s => ({ json: s }));
`;

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
if (!loginRes.ok) throw new Error(`login ${loginRes.status}`);
const cookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];

const list = await fetch(`${base}/rest/workflows?limit=250`, {
  headers: { Cookie: cookie }
}).then((r) => r.json());
const summary = (list.data || []).find((w) => w.name === "reminders");
if (!summary) throw new Error("reminders workflow missing");

const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
  headers: { Cookie: cookie }
}).then((r) => r.json());
const wf = detail.data || detail;
const connections = JSON.parse(JSON.stringify(wf.connections || {}));

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
fs.writeFileSync(
  path.join(
    backupDir,
    `reminders-inline-sql-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  ),
  JSON.stringify(wf, null, 1),
  "utf8"
);

const buildNodes = wf.nodes.filter((n) => /_sql_build$|cron_materialize_build/.test(n.name));
for (const node of buildNodes) {
  node.parameters.jsCode = SQL_BUILD;
  console.log("patched build", node.name);
}

const applyNodes = wf.nodes.filter((n) => /_apply$|cron_materialize_apply/.test(n.name));
for (const node of applyNodes) {
  node.parameters.query = "={{ $json.query }}";
  // Clear broken queryReplacement binding
  if (node.parameters.options) {
    delete node.parameters.options.queryReplacement;
  }
  console.log("patched apply", node.name);
}

// Respond from slots (once), materialize apply continues in parallel.
// Avoid N respond calls when apply emits dozens of SQL items.
for (const prefix of [
  "wh_reminders_add",
  "wh_user_task_add",
  "wh_reminders_edit",
  "wh_user_task_edit",
  "wh_resume"
]) {
  const slots = `${prefix}_slots`;
  const build = `${prefix}_sql_build`;
  const apply = `${prefix}_apply`;
  const wrap = `${prefix}_wrap`;
  if (!wf.nodes.some((n) => n.name === slots)) continue;
  // slots → build and slots → wrap
  connections[slots] = {
    main: [
      [
        { node: build, type: "main", index: 0 },
        { node: wrap, type: "main", index: 0 }
      ]
    ]
  };
  // build → apply only (no wrap)
  if (connections[apply]) {
    // leave apply terminal or drop wrap link
  }
  connections[build] = {
    main: [[{ node: apply, type: "main", index: 0 }]]
  };
  delete connections[apply];
  console.log("rewired", prefix);
}

const patch = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: wf.name,
    nodes: wf.nodes,
    connections,
    settings: wf.settings,
    staticData: wf.staticData ?? null,
    active: true,
    ...(wf.versionId ? { versionId: wf.versionId } : {})
  })
});
if (!patch.ok) throw new Error(`patch ${patch.status} ${await patch.text()}`);
console.log("done");
