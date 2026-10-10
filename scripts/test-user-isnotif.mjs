import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const source = fs.readFileSync(new URL("../components/user/notificationPreference.ts", import.meta.url), "utf8");
const isolated = source.replace(/^import .*;\r?\n/gm, "").replace(/export /g, "");
const output = ts.transpileModule(`${isolated}\nexport { asNotificationPreference };`, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
assert.equal(module.asNotificationPreference(true), true);
assert.equal(module.asNotificationPreference(1), true);
assert.equal(module.asNotificationPreference("1"), true);
assert.equal(module.asNotificationPreference(false), false);
assert.equal(module.asNotificationPreference(0), false);
assert.equal(module.asNotificationPreference(null), false);
console.log("User isnotif normalization tests passed.");
