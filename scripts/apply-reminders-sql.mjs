/**
 * Apply scripts/sql/reminders.sql via phpMyAdmin helper (statement-by-statement).
 *   node scripts/apply-reminders-sql.mjs [--rollback]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const rollback = process.argv.includes("--rollback");
const file = path.join(
  process.cwd(),
  "scripts/sql",
  rollback ? "reminders_rollback.sql" : "reminders.sql"
);
const sql = fs.readFileSync(file, "utf8");

function splitStatements(text) {
  return text
    .split(";")
    .map((s) =>
      s
        .split(/\r?\n/)
        .filter((line) => !/^\s*--/.test(line))
        .join("\n")
        .trim()
    )
    .filter(Boolean);
}

const statements = splitStatements(sql);
console.log(`running ${statements.length} statements from ${path.relative(process.cwd(), file)}`);

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  const preview = stmt.replace(/\s+/g, " ").slice(0, 80);
  const res = spawnSync(
    process.execPath,
    [".cursor/sayban-ops/pma-sql.js", stmt],
    { encoding: "utf8", cwd: process.cwd() }
  );
  const out = (res.stdout || "") + (res.stderr || "");
  let parsed;
  try {
    parsed = JSON.parse(out.trim().split(/\r?\n/).pop() || out);
  } catch {
    parsed = { raw: out.slice(0, 500) };
  }
  if (res.status !== 0 || parsed.success === false) {
    console.error(`FAIL #${i + 1}: ${preview}`);
    console.error(parsed.error || parsed.text || parsed.raw || out.slice(0, 800));
    process.exit(1);
  }
  console.log(`OK #${i + 1}: ${preview}`);
}

console.log(rollback ? "rollback done" : "reminders schema applied");
