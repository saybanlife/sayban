/**
 * Dual-write companions as users (parent_user_id) while keeping users__patient ids.
 *
 *   node scripts/patch-n8n-companion-as-user.mjs
 *   node scripts/patch-n8n-companion-as-user.mjs --revert
 */
import fs from "node:fs";
import path from "node:path";

const revert = process.argv.includes("--revert");

const LIST_QUERY_PREV = `SELECT 
    id, 
    name, 
    national_code,
    mobile,
    gender,
    marital_status,
    relation,
    city,
    address,
    details,
    postal_code,
    latitude,
    longitude,
    CASE relation
        WHEN 'father' THEN 'پدر'
        WHEN 'mother' THEN 'مادر'
        WHEN 'spouse' THEN 'همسر'
        WHEN 'child' THEN 'فرزند'
        WHEN 'brother' THEN 'برادر'
        WHEN 'sister' THEN 'خواهر'
        WHEN 'grandparent' THEN 'پدربزرگ / مادربزرگ'
        WHEN 'relative' THEN 'سایر فامیل درج شده'
        WHEN 'other' THEN 'سایر موارد (غیر فامیل)'
        ELSE relation
    END AS relation_persian
FROM users__patient 
WHERE user_id = $1;`;

const LIST_QUERY_NEXT = `SELECT 
    id, 
    user_id,
    linked_user_id,
    linked_user_id AS for_user_id,
    name, 
    national_code,
    mobile,
    gender,
    marital_status,
    relation,
    city,
    address,
    details,
    postal_code,
    latitude,
    longitude,
    CASE relation
        WHEN 'father' THEN 'پدر'
        WHEN 'mother' THEN 'مادر'
        WHEN 'spouse' THEN 'همسر'
        WHEN 'child' THEN 'فرزند'
        WHEN 'brother' THEN 'برادر'
        WHEN 'sister' THEN 'خواهر'
        WHEN 'grandparent' THEN 'پدربزرگ / مادربزرگ'
        WHEN 'relative' THEN 'سایر فامیل درج شده'
        WHEN 'other' THEN 'سایر موارد (غیر فامیل)'
        ELSE relation
    END AS relation_persian
FROM users__patient 
WHERE user_id = $1
ORDER BY id ASC;`;

const ADD_QUERY_NEXT = `SET @owner_id = CAST($1 AS UNSIGNED);
SET @name = NULLIF(TRIM($2), '');
SET @mobile = NULLIF(TRIM($3), '');
SET @national = NULLIF(TRIM($4), '');
SET @gender = CASE LOWER(TRIM($5))
  WHEN 'male' THEN 'male'
  WHEN 'female' THEN 'female'
  ELSE NULL
END;
SET @marital = CASE LOWER(TRIM($6))
  WHEN 'single' THEN 'single'
  WHEN 'married' THEN 'married'
  ELSE NULL
END;
SET @relation = NULLIF(TRIM($7), '');
SET @city = NULLIF(TRIM($8), '');
SET @address = NULLIF(TRIM($9), '');
SET @details = NULLIF(TRIM($10), '');
SET @postal = NULLIF(TRIM($11), '');
SET @lat = NULLIF(TRIM($12), '');
SET @lng = NULLIF(TRIM($13), '');
SET @ref = CONCAT('cmp', REPLACE(UUID(), '-', ''));

INSERT INTO users (
  name, refCode, mobile, active, national_code, gender, marital_status,
  parent_user_id, relation, can_login
) VALUES (
  LEFT(COALESCE(@name, 'همراه'), 50),
  LEFT(@ref, 50),
  @mobile,
  1,
  @national,
  @gender,
  @marital,
  @owner_id,
  @relation,
  0
);

SET @linked_user_id = LAST_INSERT_ID();

INSERT INTO users__patient (
  user_id, linked_user_id, name, national_code, mobile, gender, marital_status, relation,
  city, address, details, postal_code, latitude, longitude
) VALUES (
  @owner_id,
  @linked_user_id,
  COALESCE(@name, 'همراه'),
  COALESCE(@national, ''),
  @mobile,
  @gender,
  COALESCE(@marital, ''),
  @relation,
  @city,
  @address,
  @details,
  @postal,
  @lat,
  @lng
);

SELECT id, linked_user_id, user_id, name FROM users__patient WHERE id = LAST_INSERT_ID();`;

const ADD_REPLACEMENT = `={{ $('add/address1').item.json.jwtPayload.id }},{{ $('add/address1').item.json.body.name }},{{ $('add/address1').item.json.body.mobile }},{{ $('add/address1').item.json.body.national_code }},{{ $('add/address1').item.json.body.gender }},{{ $('add/address1').item.json.body.marital_status }},{{ $('add/address1').item.json.body.relation }},{{ $('add/address1').item.json.body.city }},{{ $('add/address1').item.json.body.address }},{{ $('add/address1').item.json.body.details }},{{ $('add/address1').item.json.body.postal_code }},{{ $('add/address1').item.json.body.latitude }},{{ $('add/address1').item.json.body.longitude }}`;

const UPDATE_QUERY_NEXT = `UPDATE users__patient
SET name = $3,
    national_code = $4,
    mobile = $5,
    gender = $6,
    marital_status = $7,
    relation = $8,
    city = $9,
    address = $10,
    details = $11,
    postal_code = $12,
    latitude = $13,
    longitude = $14
WHERE id = $1 AND user_id = $2;

UPDATE users u
INNER JOIN users__patient p ON p.linked_user_id = u.id
SET u.name = LEFT(NULLIF(TRIM($3), ''), 50),
    u.national_code = NULLIF(TRIM($4), ''),
    u.mobile = NULLIF(TRIM($5), ''),
    u.gender = CASE LOWER(TRIM($6)) WHEN 'male' THEN 'male' WHEN 'female' THEN 'female' ELSE NULL END,
    u.marital_status = CASE LOWER(TRIM($7)) WHEN 'single' THEN 'single' WHEN 'married' THEN 'married' ELSE NULL END,
    u.relation = NULLIF(TRIM($8), '')
WHERE p.id = $1 AND p.user_id = $2 AND u.parent_user_id = $2;`;

const DELETE_QUERY_NEXT = `UPDATE users u
INNER JOIN users__patient p ON p.linked_user_id = u.id
SET u.active = 0, u.can_login = 0
WHERE p.id = $1 AND p.user_id = $2 AND u.parent_user_id = $2;

DELETE FROM users__patient WHERE id = $1 AND user_id = $2;`;

const UPDATE_QUERY_PREV = `UPDATE users__patient
SET name = $3,
    national_code = $4,
    mobile = $5,
    gender = $6,
    marital_status = $7,
    relation = $8,
    city = $9,
    address = $10,
    details = $11,
    postal_code = $12,
    latitude = $13,
    longitude = $14
WHERE id = $1 AND user_id = $2;`;

const DELETE_QUERY_PREV = `DELETE FROM users__patient WHERE id = $1 AND user_id = $2;`;

const PARSE_PREV = `const inputData = $input.first().json.body;
const jwtUserId = $input.first().json.jwtPayload?.id || null;

const result = { 
    ...inputData,
    user_id: jwtUserId,
    service_location: "home",
    status: "awaitingOffers"
};

if (result.answers && typeof result.answers === 'string') {
    try {
        result.answers = JSON.parse(result.answers);
    } catch (e) {
        result.answers = [];
    }
}

if (Array.isArray(result.answers)) {
    const addressQ = result.answers.find(q => q.type === 'address');
    result.extracted_address_id = (addressQ && addressQ.answer) ? addressQ.answer.id : null;

    const genderQ = result.answers.find(q => q.question_text && q.question_text.includes('جنسیت ترجیحی'));
    result.extracted_gender = genderQ ? genderQ.answer : null;

    const durationQ = result.answers.find(q => q.question_text && q.question_text.includes('مدت خدمت'));
    result.extracted_duration_type = durationQ ? durationQ.answer : null;

    const consultQ = result.answers.find(q => q.type === 'checkbox');
    result.extracted_needs_consultation = consultQ ? (consultQ.answer ? 1 : 0) : 0;
}

return [{ json: result }];
`;

const PARSE_NEXT = `const inputData = $input.first().json.body || {};
const jwtUserId = Number($input.first().json.jwtPayload?.id) || null;

let patientId = Number(inputData.patient_id);
if (!Number.isFinite(patientId) || patientId <= 0) patientId = null;

let forUserId = Number(inputData.for_user_id);
if (!Number.isFinite(forUserId) || forUserId <= 0) forUserId = null;

const result = {
  ...inputData,
  user_id: jwtUserId,
  patient_id: patientId,
  for_user_id: forUserId,
  service_location: "home",
  status: "awaitingOffers"
};

if (result.answers && typeof result.answers === "string") {
  try {
    result.answers = JSON.parse(result.answers);
  } catch (e) {
    result.answers = [];
  }
}

if (Array.isArray(result.answers)) {
  const addressQ = result.answers.find(q => q.type === "address");
  result.extracted_address_id =
    addressQ && addressQ.answer ? addressQ.answer.id : null;

  const genderQ = result.answers.find(
    q => q.question_text && q.question_text.includes("جنسیت ترجیحی")
  );
  result.extracted_gender = genderQ ? genderQ.answer : null;

  const durationQ = result.answers.find(
    q => q.question_text && q.question_text.includes("مدت خدمت")
  );
  result.extracted_duration_type = durationQ ? durationQ.answer : null;

  const consultQ = result.answers.find(q => q.type === "checkbox");
  result.extracted_needs_consultation = consultQ
    ? consultQ.answer
      ? 1
      : 0
    : 0;
}

return [{ json: result }];
`;

const RESOLVE_FOR_USER_QUERY = `SELECT
  CASE
    WHEN $2 IS NULL OR $2 = 0 THEN $1
    ELSE COALESCE(
      (SELECT linked_user_id FROM users__patient WHERE id = $2 AND user_id = $1 LIMIT 1),
      $1
    )
  END AS for_user_id,
  $1 AS user_id,
  NULLIF($2, 0) AS patient_id`;

const BOOKING_INSERT_PREV = `INSERT INTO \`reservations\`(\`center_id\`, \`service_id\`, \`user_id\`, \`start_time\`, \`end_time\`, \`final_price\`, \`service_location\`, \`patient_id\`, \`status\`) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')`;

const BOOKING_INSERT_NEXT = `INSERT INTO \`reservations\`(
  \`center_id\`, \`service_id\`, \`user_id\`, \`start_time\`, \`end_time\`,
  \`final_price\`, \`service_location\`, \`patient_id\`, \`for_user_id\`, \`status\`
)
VALUES (
  $1, $2, $3, $4, $5, $6, $7,
  NULLIF($8, 0),
  CASE
    WHEN $8 IS NULL OR $8 = 0 THEN $3
    ELSE COALESCE(
      (SELECT linked_user_id FROM users__patient WHERE id = $8 AND user_id = $3 LIMIT 1),
      $3
    )
  END,
  'pending'
)`;

const BOOKING_REPLACEMENT =
  "={{ $json.id }},{{ $('reservations').item.json.body.service_code === 'VISIT' ? $json.visit_service_id : $('reservations').item.json.body.service_id }},{{ $('reservations').item.json.jwtPayload.id }},{{ $('reservations').item.json.body.start_time }},{{ $('reservations').item.json.body.end_time }},{{ $('reservations').item.json.body.final_price }},'{{ $('reservations').item.json.body.service_location }}',{{ $('reservations').item.json.body.patient_id }}";

function readEnv() {
  return Object.fromEntries(
    fs
      .readFileSync(
        path.join(process.cwd(), ".cursor/sayban-ops/secrets/n8n_sayban.env"),
        "utf8"
      )
      .split(/\r?\n/)
      .filter(line => line.trim() && !line.trim().startsWith("#"))
      .map(line => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      })
  );
}

async function login(base, env) {
  const response = await fetch(`${base}/rest/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      emailOrLdapLoginId: env.N8N_USER,
      password: env.N8N_PASSWORD
    })
  });
  if (!response.ok) throw new Error(`n8n login failed: ${response.status}`);
  return (response.headers.get("set-cookie") || "").split(";")[0];
}

async function loadWorkflow(base, cookie, name) {
  const list = await fetch(`${base}/rest/workflows?limit=250`, {
    headers: { Cookie: cookie, Accept: "application/json" }
  }).then(r => r.json());
  const summary = (list.data || []).find(item => item.name === name);
  if (!summary) throw new Error(`workflow ${name} not found`);
  const detail = await fetch(`${base}/rest/workflows/${summary.id}`, {
    headers: { Cookie: cookie, Accept: "application/json" }
  }).then(r => r.json());
  return { id: summary.id, workflow: detail.data || detail };
}

async function saveWorkflow(base, cookie, id, workflow, nodes) {
  const response = await fetch(`${base}/rest/workflows/${id}`, {
    method: "PATCH",
    headers: {
      Cookie: cookie,
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: workflow.name,
      nodes,
      connections: workflow.connections,
      settings: workflow.settings || {},
      staticData: workflow.staticData
    })
  });
  if (!response.ok) {
    throw new Error(
      `patch ${workflow.name} failed: ${response.status} ${await response.text()}`
    );
  }
}

function backup(workflow, tag) {
  const backupDir = path.join(process.cwd(), "scripts", "backup");
  fs.mkdirSync(backupDir, { recursive: true });
  const file = path.join(
    backupDir,
    `${workflow.name}-${tag}-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`
  );
  fs.writeFileSync(file, JSON.stringify(workflow, null, 2), "utf8");
  console.log(`backup: ${path.relative(process.cwd(), file)}`);
}

const env = readEnv();
const base = String(env.N8N_URL || "").replace(/\/$/, "");
const cookie = await login(base, env);

// --- users workflow ---
{
  const { id, workflow } = await loadWorkflow(base, cookie, "users");
  backup(workflow, "companion-as-user");
  const nodes = structuredClone(workflow.nodes);
  const listNode = nodes.find(node => node.name === "MySQL10");
  const addNode = nodes.find(node => node.name === "MySQL9");
  const updateNode = nodes.find(node => node.name === "patient_update_sql");
  const deleteNode = nodes.find(node => node.name === "patient_delete_sql");
  if (!listNode || !addNode || !updateNode || !deleteNode) {
    throw new Error("users workflow nodes missing");
  }

  if (revert) {
    listNode.parameters.query = LIST_QUERY_PREV;
    addNode.parameters = {
      table: {
        __rl: true,
        value: "users__patient",
        mode: "list",
        cachedResultName: "users__patient"
      },
      options: {}
    };
    updateNode.parameters.query = UPDATE_QUERY_PREV;
    deleteNode.parameters.query = DELETE_QUERY_PREV;
  } else {
    listNode.parameters.query = LIST_QUERY_NEXT;
    addNode.parameters = {
      operation: "executeQuery",
      query: ADD_QUERY_NEXT,
      options: { queryReplacement: ADD_REPLACEMENT }
    };
    updateNode.parameters.query = UPDATE_QUERY_NEXT;
    deleteNode.parameters.query = DELETE_QUERY_NEXT;
  }

  await saveWorkflow(base, cookie, id, workflow, nodes);
  console.log(revert ? "reverted users workflow" : "patched users workflow");
}

// --- reservations workflow ---
{
  const { id, workflow } = await loadWorkflow(base, cookie, "reservations");
  backup(workflow, "companion-as-user");
  const nodes = structuredClone(workflow.nodes);
  const connections = structuredClone(workflow.connections);
  const parseNode = nodes.find(node => node.name === "Parse Request & Answers");
  const insertNode = nodes.find(node => node.name === "Insert Reservation");
  const bookingInsert = nodes.find(node => node.name === "MySQL8");
  if (!parseNode || !insertNode || !bookingInsert) {
    throw new Error("reservations workflow nodes missing");
  }

  parseNode.parameters.jsCode = revert ? PARSE_PREV : PARSE_NEXT;
  bookingInsert.parameters.query = revert
    ? BOOKING_INSERT_PREV
    : BOOKING_INSERT_NEXT;
  bookingInsert.parameters.options = {
    ...(bookingInsert.parameters.options || {}),
    queryReplacement: BOOKING_REPLACEMENT,
    detailedOutput: true
  };

  if (!revert) {
    let resolveNode = nodes.find(node => node.name === "Resolve for_user");
    if (!resolveNode) {
      resolveNode = {
        parameters: {
          operation: "executeQuery",
          query: RESOLVE_FOR_USER_QUERY,
          options: {
            queryReplacement:
              "={{ $json.user_id }},{{ $json.patient_id || 0 }}"
          }
        },
        id: "ResolveForUserCompanionAsUser",
        name: "Resolve for_user",
        type: "n8n-nodes-base.mySql",
        typeVersion: 2.4,
        position: [
          (parseNode.position?.[0] || 0) + 220,
          parseNode.position?.[1] || 0
        ]
      };
      nodes.push(resolveNode);
    } else {
      resolveNode.parameters.query = RESOLVE_FOR_USER_QUERY;
      resolveNode.parameters.options = {
        queryReplacement: "={{ $json.user_id }},{{ $json.patient_id || 0 }}"
      };
    }

    // Parse → Resolve → Insert
    connections["Parse Request & Answers"] = {
      main: [[{ node: "Resolve for_user", type: "main", index: 0 }]]
    };
    connections["Resolve for_user"] = {
      main: [[{ node: "Insert Reservation", type: "main", index: 0 }]]
    };

    // Merge resolved for_user_id into insert values
    const values = insertNode.parameters?.valuesToSend?.values || [];
    const hasForUser = values.some(item => item.column === "for_user_id");
    if (!hasForUser) {
      values.push({
        column: "for_user_id",
        value: "={{ $json.for_user_id }}"
      });
    } else {
      const row = values.find(item => item.column === "for_user_id");
      row.value = "={{ $json.for_user_id }}";
    }
    // Keep patient_id from parse node via Resolve passthrough — Resolve only returns for_user_id.
    // Fix Resolve to pass through by using Code merge instead.
  } else {
    connections["Parse Request & Answers"] = {
      main: [[{ node: "Insert Reservation", type: "main", index: 0 }]]
    };
    delete connections["Resolve for_user"];
    nodes.splice(
      nodes.findIndex(node => node.name === "Resolve for_user"),
      1
    );
    const values = insertNode.parameters?.valuesToSend?.values || [];
    insertNode.parameters.valuesToSend.values = values.filter(
      item => item.column !== "for_user_id"
    );
  }

  // Better: Code merge after resolve so Insert still gets all parse fields
  if (!revert) {
    let mergeNode = nodes.find(node => node.name === "Merge for_user");
    if (!mergeNode) {
      mergeNode = {
        parameters: {
          jsCode: `const parsed = $('Parse Request & Answers').first().json;
const resolved = $input.first().json || {};
const forUserId = Number(resolved.for_user_id) || Number(parsed.for_user_id) || Number(parsed.user_id) || null;
return [{
  json: {
    ...parsed,
    for_user_id: forUserId
  }
}];`
        },
        id: "MergeForUserCompanionAsUser",
        name: "Merge for_user",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [
          (parseNode.position?.[0] || 0) + 440,
          parseNode.position?.[1] || 0
        ]
      };
      nodes.push(mergeNode);
    }
    connections["Resolve for_user"] = {
      main: [[{ node: "Merge for_user", type: "main", index: 0 }]]
    };
    connections["Merge for_user"] = {
      main: [[{ node: "Insert Reservation", type: "main", index: 0 }]]
    };
  }

  const response = await fetch(`${base}/rest/workflows/${id}`, {
    method: "PATCH",
    headers: {
      Cookie: cookie,
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: workflow.name,
      nodes,
      connections,
      settings: workflow.settings || {},
      staticData: workflow.staticData
    })
  });
  if (!response.ok) {
    throw new Error(
      `reservations patch failed: ${response.status} ${await response.text()}`
    );
  }
  console.log(
    revert ? "reverted reservations workflow" : "patched reservations workflow"
  );
}

console.log("done");
