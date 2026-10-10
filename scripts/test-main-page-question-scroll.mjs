/**
 * Panel «سؤالات فرم» must own page scroll inside the absolute Main shell.
 *
 *   node scripts/test-main-page-question-scroll.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const pageCss = fs.readFileSync(
  path.join(root, "components/MainPageQuestion.module.css"),
  "utf8"
);
const mainCss = fs.readFileSync(
  path.join(root, "components/plasmic/sayban/PlasmicMain.module.css"),
  "utf8"
);
const pageTsx = fs.readFileSync(
  path.join(root, "components/MainPageQuestion.tsx"),
  "utf8"
);

assert.match(pageCss, /\.root\s*\{[^}]*bottom:\s*0/s);
assert.match(pageCss, /\.root\s*\{[^}]*min-height:\s*0/s);
assert.match(pageCss, /\.root\s*\{[^}]*flex-direction:\s*column/s);
assert.match(pageCss, /\.root\s*\{[^}]*overflow-y:\s*auto/s);
assert.match(pageCss, /\.root\s*\{[^}]*-webkit-overflow-scrolling:\s*touch/s);
assert.doesNotMatch(pageCss, /\.root\s*\{[^}]*overflow:\s*hidden/s);
assert.match(pageCss, /\.questionList\s*\{[^}]*overflow:\s*visible/s);
assert.doesNotMatch(pageCss, /\.categoryCard\s*\{[^}]*overflow:\s*hidden/s);

assert.match(
  mainCss,
  /\.mainPageQuestion:global\(\.__wab_instance\)\s*\{[^}]*bottom:\s*0/s
);
assert.match(
  mainCss,
  /\.mainPageQuestion:global\(\.__wab_instance\)\s*\{[^}]*min-height:\s*0/s
);
assert.match(
  mainCss,
  /\.mainPageQuestion:global\(\.__wab_instance\)\s*\{[^}]*overflow-y:\s*auto/s
);
assert.doesNotMatch(
  mainCss,
  /\.mainPageQuestion:global\(\.__wab_instance\)\s*\{[^}]*overflow:\s*hidden/s
);
assert.match(
  mainCss,
  /\.mainPageQuestionpage_question:global\(\.__wab_instance\)\s*\{[^}]*flex-direction:\s*column/s
);

assert.match(pageTsx, /from "\.\/MainPageQuestion\.module\.css"/);
assert.match(pageTsx, /styles\.root/);
assert.match(pageTsx, /styles\.groups/);
assert.match(pageTsx, /styles\.questionList/);

console.log("ok   main page question scroll contract");
