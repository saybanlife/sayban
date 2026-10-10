/**
 * Choice-option card styling for nurse request / AnswersUser.
 *
 *   node scripts/test-nurse-request-choice-ui.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";

const read = relative =>
  fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");

const answersCss = read("components/AnswersUser.module.css");
const flowCss = read("components/nurseRequest/NurseRequestFlow.module.css");
const flowTsx = read("components/nurseRequest/NurseRequestFlow.tsx");

assert.match(answersCss, /border-radius:\s*999px/);
assert.match(answersCss, /#f1f5e9/);
assert.match(answersCss, /#6f8a3a|#21280d/);
assert.match(answersCss, /\.indicatorSingle\.indicatorSelected::after/);
assert.match(answersCss, /width:\s*11px/);

assert.match(flowCss, /--nr-selected-bg:\s*#f1f5e9/);
assert.match(flowCss, /--nr-selected-border:\s*#6f8a3a/);
assert.match(flowCss, /\.optionCard,\s*\n\.optionCardSelected\s*\{[\s\S]*border-radius:\s*999px/);
assert.match(flowCss, /\.optionCardSelected \.radio::after[\s\S]*width:\s*11px/);

assert.match(flowTsx, /function OptionCard/);
assert.match(flowTsx, /styles\.radio/);
assert.match(flowTsx, /<AnswersUser/);

console.log("nurse request choice UI checks passed");
