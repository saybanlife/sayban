/**
 * Audits Plasmic-generated click handlers for missing double-submit guards.
 *
 * For every `onClick={async event => { ... }}` handler it reports whether the
 * handler performs a write request and, if so, whether it also flips a
 * `loading` state (either `$state.x.loading = true` or the
 * `variablePath: [..., "loading"]` form) that the button is bound to.
 *
 * Usage: node scripts/audit-submit-buttons.mjs [--all]
 *   --all  also list handlers that are already guarded
 */

import { readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(
  /^\/([A-Za-z]:)/,
  "$1"
);
const SCAN_DIR = "components/plasmic";
const WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

async function collectFiles(dir, out = []) {
  const entries = await readdir(join(ROOT, dir), { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await collectFiles(join(dir, entry.name), out);
    } else if (entry.name.endsWith(".tsx")) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

/** Returns the handler body starting at the `{` that follows `onClick={`. */
function extractHandler(text, startIndex) {
  const open = text.indexOf("{", startIndex);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  return null;
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

const showAll = process.argv.includes("--all");
const files = await collectFiles(SCAN_DIR);

const findings = [];

for (const file of files) {
  const text = readFileSync(join(ROOT, file), "utf8");
  if (!text.includes("onClick={")) continue;

  const handlerRe = /onClick=\{/g;
  let match;
  while ((match = handlerRe.exec(text))) {
    const body = extractHandler(text, match.index);
    if (!body) continue;

    // Which write methods does this handler issue?
    const methods = WRITE_METHODS.filter(m => body.includes(`"${m}"`));
    if (!methods.length) continue;

    // Endpoints referenced in the handler, for reporting.
    const urls = Array.from(
      new Set(
        (body.match(/"(?:\/|https?:\/\/|[a-z0-9-]+\/)[^"\s]{2,80}"/gi) || [])
          .map(u => u.replace(/"/g, ""))
          .filter(u => !u.startsWith("data:") && !u.includes(" "))
      )
    ).slice(0, 4);

    const guarded =
      /\.loading\s*=\s*true/.test(body) ||
      /variablePath:\s*\[[^\]]*"loading"\s*\]/.test(body);

    if (guarded && !showAll) continue;

    findings.push({
      file: relative(ROOT, join(ROOT, file)).replace(/\\/g, "/"),
      line: lineOf(text, match.index),
      methods,
      urls,
      guarded
    });
  }
}

const unguarded = findings.filter(f => !f.guarded);
const guarded = findings.filter(f => f.guarded);

console.log(
  `Write handlers found: ${findings.length} (unguarded: ${unguarded.length}, guarded: ${guarded.length})\n`
);

for (const group of showAll ? [unguarded, guarded] : [unguarded]) {
  if (!group.length) continue;
  console.log(group === unguarded ? "=== UNGUARDED ===" : "=== GUARDED ===");
  for (const f of group) {
    console.log(
      `${f.file}:${f.line}  [${f.methods.join(",")}]  ${f.urls.join(" ") || "(url not literal)"}`
    );
  }
  console.log("");
}
