import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const hookSource = fs.readFileSync("components/home/useHomeScrollStage.ts", "utf8");
const pureSource = hookSource
  .replace('import * as React from "react";\n', "")
  .replace(/export function useHomeScrollStage[\s\S]*$/, "");
const js = ts.transpileModule(pureSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;
const exports = {};
vm.runInNewContext(js, { exports });

const target = exports.resolveHomeScrollTarget;
const next = exports.nextHomeScrollStage;
assert.equal(target(0, 0), 0);
assert.equal(target(72, 0), 1);
assert.equal(target(160, 1), 2);
assert.equal(target(260, 2), 3);
assert.equal(target(230, 3), 3, "stage 3 remains inside hysteresis band");
assert.equal(target(220, 3), 2);
assert.equal(target(128, 2), 1);
assert.equal(target(48, 1), 0);
assert.equal(target(400, 0), 3, "fast scroll computes the final target");
assert.deepEqual([next(0, 3), next(1, 3), next(2, 3)], [1, 2, 3]);
assert.deepEqual([next(3, 0), next(2, 0), next(1, 0)], [2, 1, 0]);

const css = fs.readFileSync("components/home/homeScroll.module.css", "utf8");
for (const property of ["width", "height", "max-width", "margin"]) {
  assert.doesNotMatch(
    css,
    new RegExp(`transition[^;]*${property}`, "i"),
    `${property} must not be animated`
  );
}
assert.match(css, /prefers-reduced-motion:\s*reduce/);

const homepage = fs.readFileSync("components/Homepage.tsx", "utf8");
assert.match(homepage, /ENABLE_HOME_SCROLL_STAGES && isHomeLanding/);
assert.match(homepage, /ref: homepageRootRef/);

console.log("home scroll stage tests passed");
