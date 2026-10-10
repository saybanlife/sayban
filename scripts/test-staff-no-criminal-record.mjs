/**
 * staff_no_criminal_record helpers + wiring smoke checks.
 *
 *   node scripts/test-staff-no-criminal-record.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function parseStaffNoCriminalRecord(raw) {
  if (raw === true || raw === 1 || raw === "1") return true;
  if (typeof raw === "string" && raw.toLowerCase() === "true") return true;
  return false;
}

assert.equal(parseStaffNoCriminalRecord(1), true);
assert.equal(parseStaffNoCriminalRecord("1"), true);
assert.equal(parseStaffNoCriminalRecord(true), true);
assert.equal(parseStaffNoCriminalRecord("true"), true);
assert.equal(parseStaffNoCriminalRecord(0), false);
assert.equal(parseStaffNoCriminalRecord(null), false);
assert.equal(parseStaffNoCriminalRecord(undefined), false);

const root = process.cwd();
const sql = fs.readFileSync(
  path.join(root, "scripts/sql/staff_no_criminal_record.sql"),
  "utf8"
);
assert.match(sql, /centers__staffs/);
assert.match(sql, /no_criminal_record/);
assert.match(sql, /TINYINT\(1\)/);

const rollback = fs.readFileSync(
  path.join(root, "scripts/sql/staff_no_criminal_record_rollback.sql"),
  "utf8"
);
assert.match(rollback, /DROP COLUMN no_criminal_record/);

const editStaffs = fs.readFileSync(
  path.join(root, "components/EditStaffs.tsx"),
  "utf8"
);
assert.match(editStaffs, /عدم سوءپیشینه/);
assert.match(editStaffs, /setStaffNoCriminalRecord/);

const plasmicEdit = fs.readFileSync(
  path.join(root, "components/plasmic/sayban/PlasmicEditStaffs.tsx"),
  "utf8"
);
assert.match(plasmicEdit, /no_criminal_record:\s*getStaffNoCriminalRecord\(\)/);

const itemStaffs = fs.readFileSync(
  path.join(root, "components/ItemStaffs2.tsx"),
  "utf8"
);
assert.match(itemStaffs, /StaffClearanceBadge/);
assert.match(itemStaffs, /no_criminal_record/);

const store = fs.readFileSync(
  path.join(root, "components/staff/staffClearanceStore.ts"),
  "utf8"
);
assert.match(store, /getStaffNoCriminalRecord/);
assert.match(store, /setStaffNoCriminalRecord/);

console.log("staff no_criminal_record wiring ok");
