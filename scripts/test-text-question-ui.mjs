import assert from "node:assert/strict";
import fs from "node:fs";

const read = relative =>
  fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");

const answers = read("components/AnswersUser.tsx");
const answersCss = read("components/AnswersUser.module.css");
const panel = read("components/MainPageQuestion.tsx");

assert.match(answers, /type === "textarea"/);
assert.match(answers, /parseTextQuestionConfig/);
assert.match(answers, /styles\.shortInput/);
assert.match(answers, /styles\.longInput/);
assert.match(answers, /resolvePlaceholder/);
assert.match(answers, /AddressQuestionField/);
assert.match(answers, /آدرس جدید \+/);
assert.doesNotMatch(
  answers,
  /placeholder=\{isNationalId \? "کد ملی" : "پاسخ خود را وارد کنید"\}/
);

assert.match(answersCss, /\.shortInput/);
assert.match(answersCss, /\.longInput/);
assert.match(answersCss, /border-radius: 1\.35rem/);
assert.match(answersCss, /min-height: 9\.5rem/);

assert.match(panel, /placeholder: ""/);
assert.match(panel, /serializeTextQuestionOptions/);
assert.match(panel, /Placeholder/);
assert.match(panel, /متن راهنما \(اختیاری\)/);
assert.match(panel, /questionDraft\.type === "textarea"/);

console.log("text question UI checks passed");
