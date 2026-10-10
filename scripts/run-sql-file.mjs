/**
 * Run a .sql file statement-by-statement through the phpMyAdmin helper.
 *
 *   node scripts/run-sql-file.mjs scripts/sql/some_migration.sql [--dry]
 *
 * Passing SQL through Node's argv (instead of a PowerShell string) keeps UTF-8
 * intact, which matters because these migrations contain Persian literals.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const file = process.argv[2];
const dry = process.argv.includes("--dry");
if (!file) {
  console.error("Usage: node scripts/run-sql-file.mjs <file.sql> [--dry]");
  process.exit(2);
}

const raw = fs.readFileSync(path.resolve(file), "utf8");
const statements = raw
  .split(/\r?\n/)
  .filter(line => !/^\s*--/.test(line))
  .join("\n")
  .split(";")
  .map(s => s.trim())
  .filter(Boolean);

const helper = path.resolve(".cursor/sayban-ops/pma-sql.js");

function run(sql) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [helper, sql], {
      stdio: ["ignore", "pipe", "pipe"]
    });
    let out = "";
    child.stdout.on("data", d => (out += d));
    child.stderr.on("data", d => (out += d));
    child.on("close", code => resolve({ code, out }));
  });
}

for (const [i, sql] of statements.entries()) {
  const label = `[${i + 1}/${statements.length}] ${sql.replace(/\s+/g, " ").slice(0, 90)}`;
  if (dry) {
    console.log(`DRY ${label}`);
    continue;
  }
  const { code, out } = await run(sql);
  let status = code === 0 ? "ok" : "FAIL";
  let error = null;
  try {
    const parsed = JSON.parse(out);
    status = parsed.status || status;
    error = parsed.error;
  } catch {
    /* helper printed something unparseable; keep exit-code verdict */
  }
  console.log(`${status.toUpperCase()} ${label}`);
  if (error) console.log(`   error: ${error}`);
  if (code !== 0) process.exit(1);
}
