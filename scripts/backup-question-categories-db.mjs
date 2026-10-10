/**
 * Save a read-only phpMyAdmin snapshot before the questionnaire category
 * migration. Output is ignored under scripts/backup/ and includes the current
 * schema plus every existing question row.
 */
import fs from "node:fs";
import path from "node:path";
import { runPmaSql } from "../src/lib/server/pmaSql.ts";

const backupDir = path.join(process.cwd(), "scripts", "backup");
fs.mkdirSync(backupDir, { recursive: true });

const queries = {
  questionSchema: "SHOW CREATE TABLE centers__question",
  questions: "SELECT * FROM centers__question ORDER BY id"
};
const snapshot = { createdAt: new Date().toISOString(), queries: {} };

for (const [name, sql] of Object.entries(queries)) {
  const result = await runPmaSql(sql);
  if (!result.success) throw new Error(`backup query failed: ${name}`);
  snapshot.queries[name] = { sql, responseBody: result.body };
}

const file = path.join(
  backupDir,
  `question-categories-db-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
);
fs.writeFileSync(file, JSON.stringify(snapshot, null, 2), "utf8");
console.log(`backup written: ${path.relative(process.cwd(), file)}`);

