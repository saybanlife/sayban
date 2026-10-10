/**
 * Backfill companion rows (users__patient) into users with parent_user_id.
 *
 *   node scripts/migrate-companions-to-users.mjs           # dry-run
 *   node scripts/migrate-companions-to-users.mjs --apply
 *   node scripts/migrate-companions-to-users.mjs --apply --limit=1
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const apply = process.argv.includes("--apply");
const limitArg = process.argv.find(arg => arg.startsWith("--limit="));
const limit = limitArg ? Math.max(1, Number(limitArg.split("=")[1]) || 1) : null;

function pma(sql) {
  const result = spawnSync(
    "node",
    [".cursor/sayban-ops/pma-sql.js", sql],
    { encoding: "utf8", cwd: process.cwd() }
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "pma-sql failed");
  }
  const parsed = JSON.parse(result.stdout);
  if (parsed.success === false) {
    throw new Error(parsed.error || parsed.text || "SQL failed");
  }
  return parsed;
}

function sqlString(value) {
  if (value == null || value === "") return "NULL";
  return `'${String(value).replace(/\\/g, "\\\\").replace(/'/g, "''")}'`;
}

function mapGender(value) {
  const g = String(value || "").trim().toLowerCase();
  if (g === "male" || g === "female") return g;
  return null;
}

function mapMarital(value) {
  const m = String(value || "").trim().toLowerCase();
  if (m === "single" || m === "married") return m;
  return null;
}

function mapMobile(value) {
  const mobile = String(value || "").trim();
  if (!mobile) return null;
  return mobile.slice(0, 12);
}

function extractMarkedIds(text) {
  const match = String(text || "").match(/IDS:([\d,]*):END/);
  if (!match) return [];
  return match[1]
    .split(",")
    .map(item => Number(item))
    .filter(id => Number.isInteger(id) && id > 0);
}

function extractCreatedUserId(text) {
  const match = String(text || "").match(/UID:(\d+):END/);
  return match ? Number(match[1]) : null;
}

function listPendingIds(batchSize = 5) {
  const size = limit != null ? Math.min(limit, batchSize) : batchSize;
  const parsed = pma(
    `SELECT CONCAT('ID','S:', IFNULL(GROUP_CONCAT(id ORDER BY id SEPARATOR ','), ''), ':E','ND') AS payload
     FROM (
       SELECT id FROM users__patient
       WHERE linked_user_id IS NULL
       ORDER BY id ASC
       LIMIT ${size}
     ) t`
  );
  return extractMarkedIds(parsed.text);
}

function extractTagged(text, tag) {
  const match = String(text || "").match(
    new RegExp(`ZZ${tag}Z([\\s\\S]*?)ZZENDZ`)
  );
  return match ? match[1] : null;
}

function loadPatient(id) {
  // Split marker literals so phpMyAdmin HTML (which echoes the SQL) cannot match.
  const meta = pma(
    `SELECT CONCAT('ZZM','ETAZ', id, ':', user_id, 'ZZE','NDZ') AS payload FROM users__patient WHERE id = ${id} LIMIT 1`
  );
  const metaValue = extractTagged(meta.text, "META");
  if (!metaValue) throw new Error(`could not load patient meta ${id}`);
  const [rawId, rawOwner] = metaValue.split(":");
  const name = extractTagged(
    pma(
      `SELECT CONCAT('ZZN','AMEZ', IFNULL(LEFT(name,60),''), 'ZZE','NDZ') AS payload FROM users__patient WHERE id = ${id} LIMIT 1`
    ).text,
    "NAME"
  );
  const national = extractTagged(
    pma(
      `SELECT CONCAT('ZZN','CZ', IFNULL(national_code,''), 'ZZE','NDZ') AS payload FROM users__patient WHERE id = ${id} LIMIT 1`
    ).text,
    "NC"
  );
  const mobile = extractTagged(
    pma(
      `SELECT CONCAT('ZZM','OBZ', IFNULL(mobile,''), 'ZZE','NDZ') AS payload FROM users__patient WHERE id = ${id} LIMIT 1`
    ).text,
    "MOB"
  );
  const gender = extractTagged(
    pma(
      `SELECT CONCAT('ZZG','ENZ', IFNULL(gender,''), 'ZZE','NDZ') AS payload FROM users__patient WHERE id = ${id} LIMIT 1`
    ).text,
    "GEN"
  );
  const marital = extractTagged(
    pma(
      `SELECT CONCAT('ZZM','ARZ', IFNULL(marital_status,''), 'ZZE','NDZ') AS payload FROM users__patient WHERE id = ${id} LIMIT 1`
    ).text,
    "MAR"
  );
  const relation = extractTagged(
    pma(
      `SELECT CONCAT('ZZR','ELZ', IFNULL(relation,''), 'ZZE','NDZ') AS payload FROM users__patient WHERE id = ${id} LIMIT 1`
    ).text,
    "REL"
  );
  const patientId = Number(rawId);
  const ownerId = Number(rawOwner);
  if (!Number.isInteger(patientId) || !Number.isInteger(ownerId)) {
    throw new Error(`invalid patient meta ${id}: ${metaValue}`);
  }
  return {
    id: patientId,
    user_id: ownerId,
    name: name || "",
    national_code: national || "",
    mobile: mobile || null,
    gender: gender || null,
    marital_status: marital || "",
    relation: relation || null
  };
}

console.log(apply ? "APPLY mode" : "DRY-RUN mode");
const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });
const allPatients = [];
let created = 0;
let processed = 0;

while (true) {
  const remainingBudget =
    limit == null ? Infinity : Math.max(0, limit - processed);
  if (remainingBudget <= 0) break;
  const pendingIds = listPendingIds(Math.min(5, remainingBudget));
  if (!pendingIds.length) break;

  const patients = pendingIds.map(loadPatient);
  allPatients.push(...patients);

  for (const patient of patients) {
    const patientId = Number(patient.id);
    const ownerId = Number(patient.user_id);
    const name = String(patient.name || "همراه").slice(0, 50);
    const national =
      String(patient.national_code || "").trim().slice(0, 10) || null;
    const mobile = mapMobile(patient.mobile);
    const gender = mapGender(patient.gender);
    const marital = mapMarital(patient.marital_status);
    const relation = String(patient.relation || "").trim().slice(0, 50) || null;
    const refCode = `cmp${patientId}${Date.now().toString(36)}`.slice(0, 50);

    console.log(
      `- patient#${patientId} owner#${ownerId} name=${name} → companion user`
    );
    processed += 1;

    if (!apply) continue;

    pma(`INSERT INTO users
(name, refCode, mobile, active, national_code, gender, marital_status, parent_user_id, relation, can_login)
VALUES (
  ${sqlString(name)},
  ${sqlString(refCode)},
  ${sqlString(mobile)},
  1,
  ${sqlString(national)},
  ${sqlString(gender)},
  ${sqlString(marital)},
  ${ownerId},
  ${sqlString(relation)},
  0
)`);

    const idJson = pma(
      `SELECT CONCAT('UID:', id, ':END') AS payload FROM users WHERE parent_user_id = ${ownerId} AND refCode = ${sqlString(refCode)} LIMIT 1`
    );
    const linkedUserId = extractCreatedUserId(idJson.text);
    if (!linkedUserId) {
      throw new Error(`failed to resolve new user id for patient ${patientId}`);
    }

    pma(
      `UPDATE users__patient SET linked_user_id = ${linkedUserId} WHERE id = ${patientId} AND user_id = ${ownerId}`
    );
    pma(
      `UPDATE reservations SET for_user_id = ${linkedUserId}
       WHERE patient_id = ${patientId} AND (for_user_id IS NULL OR for_user_id = 0)`
    );
    created += 1;
    console.log(`  linked_user_id=${linkedUserId}`);
  }

  if (!apply) break; // dry-run shows one batch only
}

if (!allPatients.length) {
  console.log("nothing to migrate");
  process.exit(0);
}

const backupFile = path.join(
  backupDir,
  `companions-mig-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(backupFile, JSON.stringify(allPatients, null, 2), "utf8");
console.log(`backup written: ${path.relative(process.cwd(), backupFile)}`);

if (apply) {
  pma(`UPDATE reservations r
SET r.for_user_id = r.user_id
WHERE r.patient_id IS NULL AND r.for_user_id IS NULL AND r.user_id IS NOT NULL`);
  console.log(`created companion users: ${created}`);
} else {
  console.log("dry-run complete; re-run with --apply to write");
}
