import { spawnSync } from "node:child_process";

function pma(sql) {
  const r = spawnSync("node", [".cursor/sayban-ops/pma-sql.js", sql], {
    encoding: "utf8",
    cwd: process.cwd()
  });
  return r.stdout || "";
}

function grab(prefix, text) {
  const re = new RegExp(prefix + "[A-Za-z0-9_():',|-]+", "g");
  return [...new Set([...(text.match(re) || [])])];
}

console.log(
  "COLS",
  grab(
    "CCOL",
    pma(
      "SELECT CONCAT('CCOL',COLUMN_NAME,'T',DATA_TYPE,'N',IS_NULLABLE,'E',IFNULL(COLUMN_TYPE,'x')) AS x FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='centers__working_hours' ORDER BY ORDINAL_POSITION"
    )
  )
);

console.log(
  "IDX",
  grab(
    "IIDX",
    pma(
      "SELECT CONCAT('IIDX',INDEX_NAME,'U',NON_UNIQUE,'C',COLUMN_NAME,'S',SEQ_IN_INDEX) AS x FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='centers__working_hours' ORDER BY INDEX_NAME, SEQ_IN_INDEX"
    )
  )
);

console.log(
  "DUP",
  grab(
    "DDUP",
    pma(
      "SELECT CONCAT('DDUP',center_id,'D',day_of_week,'N',cnt) AS x FROM (SELECT center_id, day_of_week, COUNT(*) cnt FROM centers__working_hours WHERE center_id IS NOT NULL GROUP BY center_id, day_of_week HAVING cnt>1 ORDER BY cnt DESC LIMIT 20) t"
    )
  )
);
