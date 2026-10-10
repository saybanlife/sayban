import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const read = relative =>
  fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");

const helperSource = read("components/address/addressDetails.ts");
const helperOutput = ts.transpileModule(helperSource, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 }
}).outputText;
const details = await import(
  `data:text/javascript;base64,${Buffer.from(helperOutput).toString("base64")}`
);

assert.deepEqual(details.splitAddressDetails("پلاک ۱۲، واحد ۳"), {
  plaque: "۱۲",
  unit: "۳"
});
assert.deepEqual(details.splitAddressDetails("طبقه دوم"), {
  plaque: "طبقه دوم",
  unit: ""
});
assert.equal(details.joinAddressDetails("۱۲", "۳"), "پلاک ۱۲، واحد ۳");
assert.equal(details.joinAddressDetails("۱۲", ""), "پلاک ۱۲");

const component = read("components/AddAddress.tsx");
const styles = read("components/AddAddress.module.css");
assert.match(component, /step === 1 \? \(/, "step one must keep its existing component");
assert.match(component, /<DefaultLoaction2/);
assert.match(component, /<TextAreaInput/);
assert.match(component, /<TextInput/);
assert.match(component, /renderProps\.onAddressChange2/);
assert.match(component, /renderProps\.onPostChange/);
assert.match(component, /step === 2 \? styles\.step2Header/);
assert.match(component, /ذخیره و ادامه/);
assert.match(component, /progressWrap/);
assert.match(component, /contextChip/);
assert.match(component, /readWizardSnapshot/);
assert.match(styles, /\.pageStep2 \.mapStage[\s\S]*height:\s*11\.5rem/);
assert.match(styles, /\.addressParts[\s\S]*grid-template-columns:\s*repeat\(2/);
assert.match(styles, /--aa-yellow:\s*#f9bd00/);
assert.match(styles, /text-align:\s*right/);

console.log("AddAddress step-two UI tests passed.");
