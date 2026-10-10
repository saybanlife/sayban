/**
 * Fix panel working-hours save (panel/update/center):
 * Root causes:
 * 1) Hours path was gated behind HTTP Request2 → panel/update/service;
 *    when only `times` is sent (no `info`), that call fails and hours never run.
 * 2) centers__working_hours had no UNIQUE(center_id, day_of_week), so
 *    INSERT ... ON DUPLICATE KEY UPDATE never updated — duplicates piled up.
 *
 *   node scripts/patch-n8n-panel-working-hours-upsert.mjs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const WORKFLOW = "panel2";

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

const NORMALIZE_TIMES_JS = `const raw = $("panel/update/center").first().json || {};
const body = raw.body && typeof raw.body === "object" ? raw.body : raw;
const centerId = Number(body.center_id);
if (!Number.isFinite(centerId) || centerId <= 0) {
  throw new Error("center_id نامعتبر است.");
}
const times = Array.isArray(body.times) ? body.times : [];
if (!times.length) {
  return [{ json: { skip: true, center_id: centerId, message: "times empty" } }];
}
return times.map(day => {
  const value = String(day?.value || day?.day_of_week || "").trim();
  if (!value) {
    throw new Error("day_of_week نامعتبر است.");
  }
  const isClosed = Boolean(day?.isHoliday ?? day?.is_closed);
  const open24 = Boolean(day?.open24);
  let start = String(day?.start || day?.open_time || "").trim();
  let end = String(day?.end || day?.close_time || "").trim();
  if (isClosed) {
    start = "00:00";
    end = "00:00";
  } else if (open24) {
    start = "00:00";
    end = "23:59";
  } else {
    if (!/^\\d{2}:\\d{2}$/.test(start)) start = "08:00";
    if (!/^\\d{2}:\\d{2}$/.test(end)) end = "17:00";
  }
  return {
    json: {
      skip: false,
      center_id: centerId,
      week: {
        value,
        start,
        end,
        isHoliday: isClosed ? 1 : 0
      }
    }
  };
});
`;

const UPSERT_SQL = `INSERT INTO centers__working_hours
  (center_id, day_of_week, open_time, close_time, is_closed)
VALUES
  ($1, $2, $3, $4, $5)
ON DUPLICATE KEY UPDATE
  open_time = VALUES(open_time),
  close_time = VALUES(close_time),
  is_closed = VALUES(is_closed);`;

// Match existing panel2 MySQL queryReplacement style (comma-separated exprs).
const UPSERT_REPL =
  "={{ $json.center_id }},{{ $json.week.value }},{{ $json.week.start }},{{ $json.week.end }},{{ $json.week.isHoliday }}";

const ADD_WEEK_NORMALIZE_JS = `const raw = $input.first().json || {};
const body = raw.body && typeof raw.body === "object" ? raw.body : raw;
const centerId = Number(body.center_id);
if (!Number.isFinite(centerId) || centerId <= 0) {
  throw new Error("center_id نامعتبر است.");
}
const week = Array.isArray(body.week) ? body.week : [];
return week.map(day => {
  const value = String(day?.value || day?.day_of_week || "").trim();
  const isClosed = Boolean(day?.isHoliday ?? day?.is_closed);
  let start = String(day?.start || day?.open_time || "").trim();
  let end = String(day?.end || day?.close_time || "").trim();
  if (isClosed) {
    start = "00:00";
    end = "00:00";
  } else {
    if (!/^\\d{2}:\\d{2}$/.test(start)) start = "08:00";
    if (!/^\\d{2}:\\d{2}$/.test(end)) end = "17:00";
  }
  return {
    json: {
      center_id: centerId,
      week: { value, start, end, isHoliday: isClosed ? 1 : 0 }
    }
  };
});
`;

const FORMAT_OK_JS = `const items = $input.all();
const skipped = items.length === 1 && items[0].json?.skip === true;
return [{
  json: {
    success: true,
    message: skipped ? (items[0].json.message || "times empty") : "ساعات کاری ذخیره شد.",
    saved: skipped ? 0 : items.length
  }
}];`;

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
const summary = (list.data || []).find(w => w.name === WORKFLOW);
if (!summary) throw new Error(`workflow ${WORKFLOW} not found`);
const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
  headers: { Cookie: cookie, Accept: "application/json" }
}).then(r => r.json());
const wf = detail.data || detail;

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
fs.writeFileSync(
  path.join(
    backupDir,
    `panel2-working-hours-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
  ),
  JSON.stringify(wf, null, 1),
  "utf8"
);

const byName = Object.fromEntries(wf.nodes.map(n => [n.name, n]));

const webhook = byName["panel/update/center"];
const httpServices = byName["HTTP Request2"];
const normalize = byName["Base64 → Binary6"];
const mysql = byName.MySQL44;
const respond = byName["Respond to Webhook52"];
if (!webhook || !normalize || !mysql || !respond) {
  throw new Error("panel/update/center times nodes missing");
}

normalize.type = "n8n-nodes-base.code";
normalize.typeVersion = 2;
normalize.parameters = {
  mode: "runOnceForAllItems",
  jsCode: NORMALIZE_TIMES_JS
};

mysql.parameters = {
  operation: "executeQuery",
  query: UPSERT_SQL,
  options: { queryReplacement: UPSERT_REPL }
};

let format = byName["panel_working_hours_format"];
if (!format) {
  format = {
    id: uid(),
    name: "panel_working_hours_format",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [
      (respond.position?.[0] || 0) - 180,
      respond.position?.[1] || 0
    ],
    parameters: {
      mode: "runOnceForAllItems",
      jsCode: FORMAT_OK_JS
    }
  };
  wf.nodes.push(format);
} else {
  format.parameters = {
    mode: "runOnceForAllItems",
    jsCode: FORMAT_OK_JS
  };
}

// Filter: only non-skip items go to MySQL; skip items go straight to format.
let filter = byName["panel_working_hours_filter"];
if (!filter) {
  filter = {
    id: uid(),
    name: "panel_working_hours_filter",
    type: "n8n-nodes-base.if",
    typeVersion: 2,
    position: [
      (normalize.position?.[0] || 0) + 200,
      normalize.position?.[1] || 0
    ],
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: "",
          typeValidation: "loose"
        },
        conditions: [
          {
            id: uid(),
            leftValue: "={{ $json.skip }}",
            rightValue: true,
            operator: {
              type: "boolean",
              operation: "notEquals"
            }
          }
        ],
        combinator: "and"
      },
      options: {}
    }
  };
  wf.nodes.push(filter);
}

respond.parameters = {
  respondWith: "json",
  responseBody: "={{ JSON.stringify($json) }}",
  options: {}
};

if (httpServices) {
  // Do not block hours on services update; only call when info is present.
  httpServices.continueOnFail = true;
  httpServices.onError = "continueRegularOutput";
  httpServices.parameters = {
    ...httpServices.parameters,
    method: "POST",
    url: "https://sayban.darkube.ir/webhook/panel/update/service",
    sendBody: true,
    specifyBody: "json",
    jsonBody:
      "={{ { info: $json.body?.info ?? $json.info ?? [] } }}",
    options: {
      ...(httpServices.parameters?.options || {}),
      response: { response: { neverError: true } }
    }
  };
}

// Hours path is primary and always reaches Respond (never gated on services).
wf.connections["panel/update/center"] = {
  main: [
    [
      { node: "Base64 → Binary6", type: "main", index: 0 },
      ...(httpServices
        ? [{ node: "HTTP Request2", type: "main", index: 0 }]
        : [])
    ]
  ]
};
wf.connections["Base64 → Binary6"] = {
  main: [[{ node: "panel_working_hours_filter", type: "main", index: 0 }]]
};
// IF true (not skip) → MySQL → format → respond
// IF false (skip) → format → respond
wf.connections.panel_working_hours_filter = {
  main: [
    [{ node: "MySQL44", type: "main", index: 0 }],
    [{ node: "panel_working_hours_format", type: "main", index: 0 }]
  ]
};
wf.connections.MySQL44 = {
  main: [[{ node: "panel_working_hours_format", type: "main", index: 0 }]]
};
wf.connections.panel_working_hours_format = {
  main: [[{ node: "Respond to Webhook52", type: "main", index: 0 }]]
};
if (httpServices) {
  // Side-branch only; continueOnFail so services errors cannot block hours Respond.
  wf.connections["HTTP Request2"] = { main: [[]] };
}

// Remove obsolete loop node connections if present
delete wf.connections.panel_working_hours_loop;

// --- week SELECT used when loading center ---
if (byName.week) {
  byName.week.parameters = {
    ...(byName.week.parameters || {}),
    operation: "executeQuery",
    query:
      "SELECT * FROM `centers__working_hours` WHERE center_id=$1 ORDER BY FIELD(day_of_week,'Sat','Sun','Mon','Tue','Wed','Thu','Fri'), id DESC",
    options: byName.week.parameters?.options || {
      queryReplacement: "={{ $('CenterInfo').item.json.id.toString() }}"
    }
  };
}

// --- add/week upsert ---
const addWh = byName["add/week"];
const addCode = byName["Base64 → Binary5"];
const addMysql = byName.MySQL6;
if (addWh && addCode && addMysql) {
  addCode.parameters = { jsCode: ADD_WEEK_NORMALIZE_JS };
  addMysql.parameters = {
    operation: "executeQuery",
    query: UPSERT_SQL,
    options: {
      queryReplacement:
        "={{ $json.center_id }},{{ $json.week.value }},{{ $json.week.start }},{{ $json.week.end }},{{ $json.week.isHoliday }}"
    }
  };
}

const patchRes = await fetch(`${base}/rest/workflows/${summary.id}`, {
  method: "PATCH",
  headers: { Cookie: cookie, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: wf.settings || {},
    active: true
  })
});
if (!patchRes.ok) {
  throw new Error(`patch failed: ${patchRes.status} ${await patchRes.text()}`);
}

console.log("panel working-hours upsert wiring OK (hours not gated on services)");
