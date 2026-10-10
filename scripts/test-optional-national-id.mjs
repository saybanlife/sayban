import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

async function importTypeScript(path) {
  const source = fs.readFileSync(new URL(path, import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

const { normalizeOptionalProfileNationalCode } = await importTypeScript(
  "../src/lib/profilePayload.ts"
);
const fieldRulesSource = fs.readFileSync(
  new URL("../components/formFieldRules.ts", import.meta.url),
  "utf8"
);
assert.match(
  fieldRulesSource,
  /getNationalIdError[\s\S]*required = false[\s\S]*required \? ["']لطفا کد ملی را وارد کنید["'] : undefined/
);

assert.deepEqual(
  normalizeOptionalProfileNationalCode("/setProfile", {
    name: "کاربر",
    national_code: "",
    city: "  ",
    birth_date: ""
  }),
  { name: "کاربر", national_code: null, city: null, birth_date: null }
);
assert.deepEqual(
  normalizeOptionalProfileNationalCode("setProfile", {
    national_code: "  "
  }),
  { national_code: null }
);
assert.deepEqual(
  normalizeOptionalProfileNationalCode("/setProfile", {
    national_code: "0013547839",
    city: "تهران",
    birth_date: "1990-01-02"
  }),
  {
    national_code: "0013547839",
    city: "تهران",
    birth_date: "1990-01-02"
  }
);
assert.deepEqual(
  normalizeOptionalProfileNationalCode("/other", { national_code: "" }),
  { national_code: "" }
);

console.log("Optional profile extras tests passed.");
