/**
 * Patches panel.json and sayban.json with FAQ / amenities / social URL endpoints.
 * Outputs panel.updated.json, sayban.updated.json, reservations.updated.json
 */
import { readFileSync, writeFileSync } from "fs";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const MYSQL_CREDENTIALS = {
  mySql: { id: "oNRa6pdlbbcsx18m", name: "MySQL account" },
};

const PANEL_WEBHOOK_ID = "242a454c-373d-43ea-a5fd-d5128b34cb74";
const SAYBAN_WEBHOOK_ID = "8c1fb835-2762-45f6-b043-99ab6af10a7a";

function uuid() {
  return randomUUID();
}

function mysqlNode(name, query, queryReplacement, position, extra = {}) {
  return {
    parameters: {
      operation: "executeQuery",
      query,
      options: queryReplacement ? { queryReplacement } : {},
    },
    type: "n8n-nodes-base.mySql",
    typeVersion: 2.4,
    position,
    id: uuid(),
    name,
    alwaysOutputData: true,
    executeOnce: true,
    credentials: MYSQL_CREDENTIALS,
    onError: "continueRegularOutput",
    ...extra,
  };
}

function respondNode(name, position) {
  return {
    parameters: { options: {} },
    type: "n8n-nodes-base.respondToWebhook",
    typeVersion: 1.4,
    position,
    id: uuid(),
    name,
  };
}

function codeNode(name, jsCode, position) {
  return {
    parameters: { jsCode },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position,
    id: uuid(),
    name,
  };
}

function webhookNode(name, path, position, opts = {}) {
  return {
    parameters: {
      path,
      responseMode: "responseNode",
      options: {},
      ...opts.parameters,
    },
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position,
    id: uuid(),
    name,
    webhookId: opts.webhookId || PANEL_WEBHOOK_ID,
    ...(opts.credentials ? { credentials: opts.credentials } : {}),
  };
}

const wrapResultCode = `const output = [];
for (const item of items) {
  output.push(item.json);
}
return [{ json: { success: true, result: output } }];`;

function patchSayban(workflow) {
  const faqsNode = mysqlNode(
    "center_faqs_public",
    "SELECT id, question, answer, sort_order\nFROM centers__faqs\nWHERE center_id = $1\n  AND is_active = 1\nORDER BY sort_order ASC, id ASC;",
    "={{ $('CenterInfo1').item.json.id.toString() }}",
    [-1460, 1100]
  );

  const amenitiesNode = mysqlNode(
    "center_amenities_public",
    "SELECT a.id, a.name, a.slug, a.icon, a.description, a.sort_order\nFROM centers__amenities ca\nINNER JOIN amenities a ON a.id = ca.amenity_id\nWHERE ca.center_id = $1\n  AND a.is_active = 1\nORDER BY a.sort_order ASC, a.id ASC;",
    "={{ $('CenterInfo1').item.json.id.toString() }}",
    [-1460, 1280]
  );

  const profileSectionsNode = mysqlNode(
    "center_profile_sections_public",
    "SELECT section, item_key AS `key`, label, value, sort_order\nFROM centers__profile_sections\nWHERE center_id = $1\n  AND is_active = 1\nORDER BY section ASC, sort_order ASC, id ASC;",
    "={{ $('CenterInfo1').item.json.id.toString() }}",
    [-1460, 1460]
  );

  workflow.nodes.push(faqsNode, amenitiesNode, profileSectionsNode);

  workflow.connections["CenterInfo1"].main[0].push(
    { node: "center_faqs_public", type: "main", index: 0 },
    { node: "center_amenities_public", type: "main", index: 0 },
    { node: "center_profile_sections_public", type: "main", index: 0 }
  );

  const code10 = workflow.nodes.find((n) => n.name === "Code10");
  if (code10) {
    code10.parameters.jsCode = code10.parameters.jsCode.replace(
      "const services = Array.from($('services3').all())",
      `const faqs = Array.from($('center_faqs_public').all())
                .map(i => i.json)
                .filter(i => i && Object.keys(i).length > 0);

const amenities = Array.from($('center_amenities_public').all())
                .map(i => i.json)
                .filter(i => i && Object.keys(i).length > 0);

const profileRows = Array.from($('center_profile_sections_public').all())
                .map(i => i.json)
                .filter(i => i && Object.keys(i).length > 0);
const mapProfile = (section) => profileRows
                .filter(i => i.section === section)
                .map(i => ({ key: i.key, label: i.label, value: i.value || '', sort_order: i.sort_order }));
const care_treatment = mapProfile('care_treatment');
const daily_life = mapProfile('daily_life');
const family_visit = mapProfile('family_visit');

const services = Array.from($('services3').all())`
    );

    code10.parameters.jsCode = code10.parameters.jsCode.replace(
      "...(services.length ? { services: services } : {}),",
      `...(services.length ? { services: services } : {}),
                ...(faqs.length ? { faqs: faqs } : {}),
                ...(amenities.length ? { amenities: amenities } : {}),
                ...(care_treatment.length ? { care_treatment } : {}),
                ...(daily_life.length ? { daily_life } : {}),
                ...(family_visit.length ? { family_visit } : {}),
                instagram: centerData.instagram_url || centerData.instagram || '',
                website: centerData.website_url || centerData.website || '',`
    );
  }

  return workflow;
}

function addPanelFeatureNodes(workflow) {
  const baseX = -11000;
  let y = 3200;
  const step = 180;
  const nodes = [];
  const connections = {};

  function chain(webhookName, mysqlName, respondName, path, query, queryReplacement, httpMethod) {
    const wh = webhookNode(
      webhookName,
      path,
      [baseX, y],
      httpMethod ? { parameters: { httpMethod, path } } : {}
    );
    const mysql = mysqlNode(mysqlName, query, queryReplacement, [baseX + 200, y]);
    const respond = respondNode(respondName, [baseX + 600, y]);
    const code = codeNode(`${mysqlName}_wrap`, wrapResultCode, [baseX + 400, y]);
    nodes.push(wh, mysql, code, respond);
    connections[webhookName] = { main: [[{ node: mysqlName, type: "main", index: 0 }]] };
    connections[mysqlName] = { main: [[{ node: `${mysqlName}_wrap`, type: "main", index: 0 }]] };
    connections[`${mysqlName}_wrap`] = {
      main: [[{ node: respondName, type: "main", index: 0 }]],
    };
    y += step;
  }

  // GET /panel/faqs?center_id=
  chain(
    "panel/faqs",
    "panel_faqs_list",
    "Respond panel/faqs",
    "/panel/faqs",
    "SELECT id, center_id, question, answer, sort_order, is_active, created_at, updated_at\nFROM centers__faqs\nWHERE center_id = $1\nORDER BY sort_order ASC, id ASC;",
    "={{ $json.query.center_id }}"
  );

  // POST /panel/faqs
  {
    const wh = webhookNode(
      "panel/faqs/add",
      "/panel/faqs/add",
      [baseX, y],
      { parameters: { httpMethod: "POST", path: "/panel/faqs/add" } }
    );
    const mysql = {
      parameters: {
        operation: "executeQuery",
        query:
          "INSERT INTO centers__faqs (center_id, question, answer, sort_order, is_active)\nVALUES ($1, $2, $3, $4, 1);",
        options: {
          queryReplacement:
            "={{ $json.body.center_id }},{{ $json.body.question }},{{ $json.body.answer }},{{ $json.body.sort_order || 0 }}",
          detailedOutput: true,
        },
      },
      type: "n8n-nodes-base.mySql",
      typeVersion: 2.4,
      position: [baseX + 200, y],
      id: uuid(),
      name: "panel_faqs_insert",
      credentials: MYSQL_CREDENTIALS,
      onError: "continueRegularOutput",
    };
    const code = codeNode(
      "panel_faqs_insert_wrap",
      `return [{ json: { success: true, result: { id: $input.first().json.data?.insertId } } }];`,
      [baseX + 400, y]
    );
    const respond = respondNode("Respond panel/faqs/add", [baseX + 600, y]);
    nodes.push(wh, mysql, code, respond);
    connections["panel/faqs/add"] = {
      main: [[{ node: "panel_faqs_insert", type: "main", index: 0 }]],
    };
    connections["panel_faqs_insert"] = {
      main: [[{ node: "panel_faqs_insert_wrap", type: "main", index: 0 }]],
    };
    connections["panel_faqs_insert_wrap"] = {
      main: [[{ node: "Respond panel/faqs/add", type: "main", index: 0 }]],
    };
    y += step;
  }

  // POST /panel/faqs/update
  {
    const wh = webhookNode(
      "panel/faqs/update",
      "/panel/faqs/update",
      [baseX, y],
      { parameters: { httpMethod: "POST", path: "/panel/faqs/update" } }
    );
    const mysql = mysqlNode(
      "panel_faqs_update",
      "UPDATE centers__faqs\nSET question = $2,\n    answer = $3,\n    sort_order = COALESCE($4, sort_order),\n    is_active = COALESCE($5, is_active)\nWHERE id = $1;",
      "={{ $json.body.id }},{{ $json.body.question }},{{ $json.body.answer }},{{ $json.body.sort_order ?? null }},{{ $json.body.is_active ?? null }}",
      [baseX + 200, y]
    );
    const code = codeNode("panel_faqs_update_wrap", wrapResultCode, [baseX + 400, y]);
    const respond = respondNode("Respond panel/faqs/update", [baseX + 600, y]);
    nodes.push(wh, mysql, code, respond);
    connections["panel/faqs/update"] = {
      main: [[{ node: "panel_faqs_update", type: "main", index: 0 }]],
    };
    connections["panel_faqs_update"] = {
      main: [[{ node: "panel_faqs_update_wrap", type: "main", index: 0 }]],
    };
    connections["panel_faqs_update_wrap"] = {
      main: [[{ node: "Respond panel/faqs/update", type: "main", index: 0 }]],
    };
    y += step;
  }

  // POST /panel/faqs/delete
  {
    const wh = webhookNode(
      "panel/faqs/delete",
      "/panel/faqs/delete",
      [baseX, y],
      { parameters: { httpMethod: "POST", path: "/panel/faqs/delete" } }
    );
    const mysql = mysqlNode(
      "panel_faqs_delete",
      "DELETE FROM centers__faqs WHERE id = $1;",
      "={{ $json.body.id }}",
      [baseX + 200, y]
    );
    const code = codeNode(
      "panel_faqs_delete_wrap",
      `return [{ json: { success: true, result: true } }];`,
      [baseX + 400, y]
    );
    const respond = respondNode("Respond panel/faqs/delete", [baseX + 600, y]);
    nodes.push(wh, mysql, code, respond);
    connections["panel/faqs/delete"] = {
      main: [[{ node: "panel_faqs_delete", type: "main", index: 0 }]],
    };
    connections["panel_faqs_delete"] = {
      main: [[{ node: "panel_faqs_delete_wrap", type: "main", index: 0 }]],
    };
    connections["panel_faqs_delete_wrap"] = {
      main: [[{ node: "Respond panel/faqs/delete", type: "main", index: 0 }]],
    };
    y += step;
  }

  // GET /panel/amenities/library
  chain(
    "panel/amenities/library",
    "panel_amenities_library",
    "Respond panel/amenities/library",
    "/panel/amenities/library",
    "SELECT id, name, slug, icon, description, sort_order\nFROM amenities\nWHERE is_active = 1\nORDER BY sort_order ASC, id ASC;",
    ""
  );

  // GET /panel/amenities?center_id=
  chain(
    "panel/amenities",
    "panel_amenities_center",
    "Respond panel/amenities",
    "/panel/amenities",
    "SELECT a.id, a.name, a.slug, a.icon, a.description, a.sort_order\nFROM centers__amenities ca\nINNER JOIN amenities a ON a.id = ca.amenity_id\nWHERE ca.center_id = $1\n  AND a.is_active = 1\nORDER BY a.sort_order ASC, a.id ASC;",
    "={{ $json.query.center_id }}"
  );

  // POST /panel/amenities/sync
  {
    const wh = webhookNode(
      "panel/amenities/sync",
      "/panel/amenities/sync",
      [baseX, y],
      { parameters: { httpMethod: "POST", path: "/panel/amenities/sync" } }
    );
    const prep = codeNode(
      "panel_amenities_sync_prep",
      `const centerId = $input.first().json.body.center_id;
const ids = Array.isArray($input.first().json.body.amenity_ids)
  ? $input.first().json.body.amenity_ids.map(Number).filter(Boolean)
  : [];
return [{
  json: {
    center_id: centerId,
    amenity_ids: ids,
    amenity_ids_csv: ids.length ? ids.join(',') : '0'
  }
}];`,
      [baseX + 200, y]
    );
    const deleteSql = mysqlNode(
      "panel_amenities_sync_delete",
      "DELETE FROM centers__amenities\nWHERE center_id = $1\n  AND amenity_id NOT IN ($2);",
      "={{ $json.center_id }},{{ $json.amenity_ids_csv }}",
      [baseX + 400, y]
    );
    const insertSql = mysqlNode(
      "panel_amenities_sync_insert",
      "INSERT IGNORE INTO centers__amenities (center_id, amenity_id)\nSELECT $1, a.id\nFROM amenities a\nWHERE a.id IN ($2);",
      "={{ $('panel_amenities_sync_prep').item.json.center_id }},{{ $('panel_amenities_sync_prep').item.json.amenity_ids_csv }}",
      [baseX + 600, y]
    );
    const wrap = codeNode(
      "panel_amenities_sync_wrap",
      `return [{ json: { success: true, result: true } }];`,
      [baseX + 800, y]
    );
    const respond = respondNode("Respond panel/amenities/sync", [baseX + 1000, y]);
    nodes.push(wh, prep, deleteSql, insertSql, wrap, respond);
    connections["panel/amenities/sync"] = {
      main: [[{ node: "panel_amenities_sync_prep", type: "main", index: 0 }]],
    };
    connections["panel_amenities_sync_prep"] = {
      main: [[{ node: "panel_amenities_sync_delete", type: "main", index: 0 }]],
    };
    connections["panel_amenities_sync_delete"] = {
      main: [[{ node: "panel_amenities_sync_insert", type: "main", index: 0 }]],
    };
    connections["panel_amenities_sync_insert"] = {
      main: [[{ node: "panel_amenities_sync_wrap", type: "main", index: 0 }]],
    };
    connections["panel_amenities_sync_wrap"] = {
      main: [[{ node: "Respond panel/amenities/sync", type: "main", index: 0 }]],
    };
    y += step;
  }

  // POST /panel/amenities/request
  {
    const wh = webhookNode(
      "panel/amenities/request",
      "/panel/amenities/request",
      [baseX, y],
      { parameters: { httpMethod: "POST", path: "/panel/amenities/request" } }
    );
    const mysql = mysqlNode(
      "panel_amenities_request_insert",
      "INSERT INTO amenities__requests (center_id, requested_by, name, description, status)\nVALUES ($1, $2, $3, $4, 'pending');",
      "={{ $json.body.center_id }},{{ $json.body.requested_by || null }},{{ $json.body.name }},{{ $json.body.description || '' }}",
      [baseX + 200, y],
      { executeOnce: false }
    );
    const wrap = codeNode(
      "panel_amenities_request_wrap",
      `return [{ json: { success: true, result: { id: $input.first().json.data?.insertId } } }];`,
      [baseX + 400, y]
    );
    const respond = respondNode("Respond panel/amenities/request", [baseX + 600, y]);
    nodes.push(wh, mysql, wrap, respond);
    connections["panel/amenities/request"] = {
      main: [[{ node: "panel_amenities_request_insert", type: "main", index: 0 }]],
    };
    connections["panel_amenities_request_insert"] = {
      main: [[{ node: "panel_amenities_request_wrap", type: "main", index: 0 }]],
    };
    connections["panel_amenities_request_wrap"] = {
      main: [[{ node: "Respond panel/amenities/request", type: "main", index: 0 }]],
    };
    y += step;
  }

  // GET /panel/amenities/requests?status=
  chain(
    "panel/amenities/requests",
    "panel_amenities_requests_list",
    "Respond panel/amenities/requests",
    "/panel/amenities/requests",
    "SELECT r.id, r.center_id, c.name AS center_name, r.requested_by, r.name, r.description, r.status, r.admin_note, r.amenity_id, r.reviewed_by, r.reviewed_at, r.created_at\nFROM amenities__requests r\nLEFT JOIN centers c ON c.id = r.center_id\nWHERE ($1 = '' OR r.status = $1)\nORDER BY r.created_at DESC;",
    "={{ $json.query.status || '' }}"
  );

  // GET /panel/profile-sections?center_id=&section=
  chain(
    "panel/profile-sections",
    "panel_profile_sections_list",
    "Respond panel/profile-sections",
    "/panel/profile-sections",
    "SELECT item_key AS `key`, label, value, sort_order\nFROM centers__profile_sections\nWHERE center_id = $1\n  AND section = $2\n  AND is_active = 1\nORDER BY sort_order ASC, id ASC;",
    "={{ $json.query.center_id }},{{ $json.query.section || 'care_treatment' }}"
  );

  // POST /panel/profile-sections/sync
  {
    const yPos = y;
    y += step * 4;
    const wh = webhookNode(
      "panel/profile-sections/sync",
      "/panel/profile-sections/sync",
      [baseX, yPos],
      { parameters: { httpMethod: "POST", path: "/panel/profile-sections/sync" } }
    );
    const prep = codeNode(
      "panel_profile_sections_sync_prep",
      `const body = items[0].json.body || items[0].json;
const centerId = body.center_id;
const section = body.section || 'care_treatment';
const rawItems = Array.isArray(body.items) ? body.items : [];
const rows = rawItems
  .map((item, index) => ({
    center_id: centerId,
    section,
    item_key: String(item.key || item.id || ('item_' + index)),
    label: String(item.label || item.name || '').trim(),
    value: String(item.value || item.description || '').trim(),
    sort_order: item.sort_order != null ? Number(item.sort_order) : index,
  }))
  .filter((item) => item.label);
return [{
  json: {
    center_id: centerId,
    section,
    rows,
  }
}];`,
      [baseX + 220, yPos]
    );
    const del = mysqlNode(
      "panel_profile_sections_sync_delete",
      "DELETE FROM centers__profile_sections\nWHERE center_id = $1\n  AND section = $2;",
      "={{ $('panel_profile_sections_sync_prep').item.json.center_id }},{{ $('panel_profile_sections_sync_prep').item.json.section }}",
      [baseX + 440, yPos]
    );
    const ins = codeNode(
      "panel_profile_sections_sync_insert_prep",
      `const prep = $('panel_profile_sections_sync_prep').item.json;
const rows = prep.rows || [];
if (!rows.length) {
  return [{ json: { success: true, result: true, skipped: true } }];
}
return rows.map((row) => ({ json: row }));`,
      [baseX + 660, yPos]
    );
    const upsert = mysqlNode(
      "panel_profile_sections_sync_upsert",
      "INSERT INTO centers__profile_sections (center_id, section, item_key, label, value, sort_order, is_active)\nVALUES ($1, $2, $3, $4, $5, $6, 1)\nON DUPLICATE KEY UPDATE label = VALUES(label), value = VALUES(value), sort_order = VALUES(sort_order), is_active = 1;",
      "={{ $json.center_id }},{{ $json.section }},{{ $json.item_key }},{{ $json.label }},{{ $json.value }},{{ $json.sort_order }}",
      [baseX + 880, yPos]
    );
    const wrap = codeNode(
      "panel_profile_sections_sync_wrap",
      `return [{ json: { success: true, result: true } }];`,
      [baseX + 1100, yPos]
    );
    const respond = respondNode("Respond panel/profile-sections/sync", [
      baseX + 1320,
      yPos,
    ]);
    nodes.push(wh, prep, del, ins, upsert, wrap, respond);
    connections["panel/profile-sections/sync"] = {
      main: [[{ node: "panel_profile_sections_sync_prep", type: "main", index: 0 }]],
    };
    connections["panel_profile_sections_sync_prep"] = {
      main: [[{ node: "panel_profile_sections_sync_delete", type: "main", index: 0 }]],
    };
    connections["panel_profile_sections_sync_delete"] = {
      main: [[{ node: "panel_profile_sections_sync_insert_prep", type: "main", index: 0 }]],
    };
    connections["panel_profile_sections_sync_insert_prep"] = {
      main: [[{ node: "panel_profile_sections_sync_upsert", type: "main", index: 0 }]],
    };
    connections["panel_profile_sections_sync_upsert"] = {
      main: [[{ node: "panel_profile_sections_sync_wrap", type: "main", index: 0 }]],
    };
    connections["panel_profile_sections_sync_wrap"] = {
      main: [[{ node: "Respond panel/profile-sections/sync", type: "main", index: 0 }]],
    };
  }

  workflow.nodes.push(...nodes);
  Object.assign(workflow.connections, connections);

  // Patch panel/center Code8
  const panelFaqs = mysqlNode(
    "panel_center_faqs",
    "SELECT id, question, answer, sort_order, is_active\nFROM centers__faqs\nWHERE center_id = $1\nORDER BY sort_order ASC, id ASC;",
    "={{ $('CenterInfo').item.json.id.toString() }}",
    [1740, 420]
  );
  const panelAmenities = mysqlNode(
    "panel_center_amenities",
    "SELECT a.id, a.name, a.slug, a.icon, a.description, a.sort_order\nFROM centers__amenities ca\nINNER JOIN amenities a ON a.id = ca.amenity_id\nWHERE ca.center_id = $1\nORDER BY a.sort_order ASC, a.id ASC;",
    "={{ $('CenterInfo').item.json.id.toString() }}",
    [1740, 600]
  );
  const panelProfileSections = mysqlNode(
    "panel_center_profile_sections",
    "SELECT section, item_key AS `key`, label, value, sort_order\nFROM centers__profile_sections\nWHERE center_id = $1\n  AND is_active = 1\nORDER BY section ASC, sort_order ASC, id ASC;",
    "={{ $('CenterInfo').item.json.id.toString() }}",
    [1740, 780]
  );
  workflow.nodes.push(panelFaqs, panelAmenities, panelProfileSections);
  workflow.connections["CenterInfo"].main[0].push(
    { node: "panel_center_faqs", type: "main", index: 0 },
    { node: "panel_center_amenities", type: "main", index: 0 },
    { node: "panel_center_profile_sections", type: "main", index: 0 }
  );

  const code8 = workflow.nodes.find((n) => n.name === "Code8");
  if (code8) {
    code8.parameters.jsCode = code8.parameters.jsCode.replace(
      "const services = Array.from($('services2').all())",
      `const faqs = Array.from($('panel_center_faqs').all())
                .map(i => i.json)
                .filter(i => i && Object.keys(i).length > 0);

const amenities = Array.from($('panel_center_amenities').all())
                .map(i => i.json)
                .filter(i => i && Object.keys(i).length > 0);

const profileRows = Array.from($('panel_center_profile_sections').all())
                .map(i => i.json)
                .filter(i => i && Object.keys(i).length > 0);
const mapProfile = (section) => profileRows
                .filter(i => i.section === section)
                .map(i => ({ key: i.key, label: i.label, value: i.value || '', sort_order: i.sort_order }));
const care_treatment = mapProfile('care_treatment');
const daily_life = mapProfile('daily_life');
const family_visit = mapProfile('family_visit');

const services = Array.from($('services2').all())`
    );
    code8.parameters.jsCode = code8.parameters.jsCode.replace(
      "...(services.length ? { services: services } : {}),",
      `...(services.length ? { services: services } : {}),
                ...(faqs.length ? { faqs: faqs } : {}),
                ...(amenities.length ? { amenities: amenities } : {}),
                ...(care_treatment.length ? { care_treatment } : {}),
                ...(daily_life.length ? { daily_life } : {}),
                ...(family_visit.length ? { family_visit } : {}),
                instagram_url: centerData.instagram_url || '',
                website_url: centerData.website_url || centerData.website || '',`
    );
  }

  return workflow;
}

const panel = JSON.parse(readFileSync(join(root, "panel.json"), "utf8"));
const sayban = JSON.parse(readFileSync(join(root, "sayban.json"), "utf8"));
const reservations = JSON.parse(
  readFileSync(join(root, "reservations.json"), "utf8")
);

const panelUpdated = addPanelFeatureNodes(JSON.parse(JSON.stringify(panel)));
const saybanUpdated = patchSayban(JSON.parse(JSON.stringify(sayban)));

writeFileSync(
  join(root, "panel.updated.json"),
  JSON.stringify(panelUpdated, null, 2),
  "utf8"
);
writeFileSync(
  join(root, "sayban.updated.json"),
  JSON.stringify(saybanUpdated, null, 2),
  "utf8"
);
writeFileSync(
  join(root, "reservations.updated.json"),
  JSON.stringify(reservations, null, 2),
  "utf8"
);

console.log("Generated panel.updated.json, sayban.updated.json, reservations.updated.json");
