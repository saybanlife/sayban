/**
 * Rewrites every font declaration in the Plasmic-generated code to Vazirmatn.
 *
 * Plasmic Studio regenerates `components/plasmic/**` with its own defaults
 * (Roboto / Inter / Inconsolata) and re-adds Google Fonts `@import`s, so this
 * is a codemod to re-run after a Plasmic sync rather than a one-off edit.
 *
 * Usage:
 *   node scripts/unify-fonts.mjs           # apply
 *   node scripts/unify-fonts.mjs --check   # exit 1 if anything would change
 *
 * The @font-face rules themselves live in `src/styles/globals.css`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, extname, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const CANONICAL = '"Vazirmatn", sans-serif';

/** Bare family names Plasmic emits as token values. */
const REPLACED_FAMILIES = /^(Inter|Roboto|Inconsolata|Tahoma|IranSans|system-ui)$/i;

const SEARCH_DIRS = ["components", "src"];
const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);

async function collect(dir, out = []) {
  let entries;
  try {
    entries = await readdir(join(ROOT, dir), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await collect(join(dir, entry.name), out);
    } else if ([".css", ".tsx", ".json"].includes(extname(entry.name))) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

/** Strips Google Fonts imports; they only ever fetch the fonts we just dropped. */
function dropGoogleFontImports(text) {
  return text.replace(
    /^[ \t]*@import\s+url\(\s*["']https:\/\/fonts\.googleapis\.com\/[^"']*["']\s*\);?[ \t]*\r?\n?/gm,
    ""
  );
}

function rewriteCss(text) {
  let next = dropGoogleFontImports(text);

  // `font-family: <value>` — leave `inherit` and `var(...)` alone. The vars are
  // rewritten at their definition site below, and `inherit` is already correct.
  next = next.replace(/font-family\s*:\s*([^;{}]+)/g, (match, rawValue) => {
    const value = rawValue.trim();
    const important = /!important$/.test(value);
    const family = value.replace(/\s*!important$/, "").trim();
    // `"Vazirmatn"` on its own is the @font-face descriptor, which must stay a
    // bare family name rather than becoming a stack.
    if (
      family === "inherit" ||
      family.startsWith("var(") ||
      /^["']Vazirmatn["']$/.test(family)
    ) {
      return match;
    }
    return `font-family: ${CANONICAL}${important ? " !important" : ""}`;
  });

  // Plasmic mixin vars, e.g. `--mixin-abc_font-family: "Inconsolata";`
  next = next.replace(
    /(--[A-Za-z0-9_-]+_font-family\s*:\s*)([^;{}]+)/g,
    (match, prefix) => `${prefix}${CANONICAL}`
  );

  // Font tokens are emitted as a bare family name, e.g. `--token-8ld_RqqV9anD: Inter;`
  next = next.replace(
    /(--[A-Za-z0-9_-]+\s*:\s*)([A-Za-z][A-Za-z0-9 -]*)(\s*;)/g,
    (match, prefix, value, tail) =>
      REPLACED_FAMILIES.test(value.trim()) ? `${prefix}Vazirmatn${tail}` : match
  );

  return next;
}

/**
 * Only touches `fontFamily: "<bare family>"` object properties (the Antd theme
 * token). Anything more aggressive would corrupt the EmbedCss string literal,
 * which carries its own hand-maintained CSS.
 */
function rewriteTsx(text) {
  let next = text.replace(
    /(fontFamily\s*:\s*")([^"]*)(")/g,
    (match, prefix, value, suffix) =>
      REPLACED_FAMILIES.test(value.trim())
        ? `${prefix}Vazirmatn, sans-serif${suffix}`
        : match
  );

  // Some generated components carry CSS inside a double-quoted string prop.
  // Only unquoted family lists are matched, so the replacement can safely use
  // single quotes without escaping the surrounding string literal.
  next = next.replace(
    /font-family:\s*([A-Za-z][A-Za-z0-9 -]*)(\s*,\s*(?:sans-serif|serif|monospace))?\s*;/g,
    (match, family) =>
      REPLACED_FAMILIES.test(family.trim())
        ? "font-family: 'Vazirmatn', sans-serif;"
        : match
  );

  return next;
}

/** Plasmic token export: `{ "type": "fontfamily", "value": "Inter" }`. */
function rewriteJson(text) {
  return text.replace(
    /("type"\s*:\s*"fontfamily"\s*,\s*"value"\s*:\s*")([^"]*)(")/g,
    (match, prefix, value, suffix) =>
      REPLACED_FAMILIES.test(value.trim())
        ? `${prefix}Vazirmatn${suffix}`
        : match
  );
}

const check = process.argv.includes("--check");
const files = [];
for (const dir of SEARCH_DIRS) await collect(dir, files);

const changed = [];
for (const file of files) {
  const abs = join(ROOT, file);
  const before = readFileSync(abs, "utf8");
  const ext = extname(file);
  const after =
    ext === ".css"
      ? rewriteCss(before)
      : ext === ".tsx"
        ? rewriteTsx(before)
        : rewriteJson(before);

  if (after !== before) {
    changed.push(relative(ROOT, abs));
    if (!check) writeFileSync(abs, after);
  }
}

if (check) {
  if (changed.length) {
    console.error(`Non-Vazirmatn fonts found in ${changed.length} file(s):`);
    for (const file of changed) console.error(`  ${file}`);
    process.exit(1);
  }
  console.log("All fonts are Vazirmatn.");
} else {
  console.log(`Updated ${changed.length} file(s).`);
  for (const file of changed) console.log(`  ${file}`);
}
