import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const sourcePath = new URL("../components/homepage/activeView.ts", import.meta.url);
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 }
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { resolveHomepageActiveViews } = await import(moduleUrl);
const views = (page, slug = [], status) =>
  [...resolveHomepageActiveViews(page, slug, status)].sort();

assert.deepEqual(views("home"), ["home"]);
assert.deepEqual(views("user"), ["user"]);
assert.deepEqual(views("reminder"), ["mainLiad"]);
assert.deepEqual(views("home", ["center", "42"]), ["center"]);
assert.deepEqual(views("home", ["offer_8"]), ["staffs"]);
assert.deepEqual(views("home", ["staff_7"]), ["staff"]);
assert.deepEqual(views("home", ["booking"]), ["booking"]);
assert.deepEqual(views("home", ["pay_9"], "true"), ["payResult", "payment"]);
assert.deepEqual(views("home", ["services"]), ["subcategories"]);
console.log("Homepage active-view routing tests passed.");
