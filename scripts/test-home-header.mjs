import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const read = relative =>
  fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");
const source = read("components/home/homeProfile.ts");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 }
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
const { resolveHomeProfileName } = await import(moduleUrl);

assert.equal(resolveHomeProfileName({ result: { name: "  خانم رضایی  " } }), "خانم رضایی");
assert.equal(resolveHomeProfileName({ result: { full_name: "علی رضایی" } }), "علی رضایی");
assert.equal(resolveHomeProfileName(null), "");

const homepage = read("components/Homepage.tsx");
const support = read("components/support/SupportFab.module.css");
assert.match(homepage, /header=\{[\s\S]*?سلام، \$\{profileName\}[\s\S]*?<SupportFab/);
assert.equal((homepage.match(/<SupportFab/g) || []).length, 1, "support CTA must render once inside the header");
assert.doesNotMatch(support, /position:\s*fixed/, "support CTA must not float");

console.log("Home header tests passed.");
