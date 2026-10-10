/**
 *   node scripts/test-elderly-status.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const read = relative =>
  fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");

async function loadTs(relative, importMap = {}) {
  let source = read(relative);
  for (const [from, to] of Object.entries(importMap)) {
    source = source
      .replaceAll(`from "${from}"`, `from "${to}"`)
      .replaceAll(`from '${from}'`, `from '${to}'`);
  }
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`
  );
}

function toDataUrl(source) {
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  return `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
}

const categoriesUrl = toDataUrl(read("components/questions/questionCategories.ts"));
const answerModelUrl = toDataUrl(
  read("components/questions/questionAnswerModel.ts")
);
const visibilityUrl = toDataUrl(
  read("components/questions/questionVisibility.ts")
    .replaceAll('from "./questionCategories"', `from "${categoriesUrl}"`)
    .replaceAll('from "./questionAnswerModel"', `from "${answerModelUrl}"`)
);

const {
  answersMapFromRows,
  buildElderlyStatusSavePayload,
  buildElderlySummaryRows,
  elderlySummaryLabel,
  filterElderlyStatusQuestions,
  filterNonElderlyStatusQuestions,
  formatElderlyAnswerDisplay,
  isAnswerFilled,
  isElderlyStatusComplete,
  isElderlyStatusQuestion,
  parseElderlyAnswer,
  resolveElderlyForUserId,
  serializeElderlyAnswer
} = await loadTs("components/questions/elderlyStatusModel.ts", {
  "./questionCategories": categoriesUrl,
  "./questionVisibility": visibilityUrl
});

assert.equal(
  isElderlyStatusQuestion({ category_title: "وضعیت سالمند" }),
  true
);
assert.equal(
  isElderlyStatusQuestion({ category_title: "نیازهای مراقبت" }),
  false
);

const questions = [
  {
    id: 32,
    question_text: "چطور راه می رود؟",
    type: "single_choice",
    category_id: 3,
    category_title: "وضعیت سالمند",
    is_active: 1,
    is_required: 1
  },
  {
    id: 33,
    question_text: "پوشک؟",
    type: "single_choice",
    category_id: 3,
    category_title: "وضعیت سالمند",
    is_active: 1,
    is_required: 1,
    show_if_question_id: 32,
    show_if_option: "با کمک"
  },
  {
    id: 50,
    question_text: "خدمت",
    type: "text",
    category_id: 4,
    category_title: "نیازهای مراقبت",
    is_active: 1
  }
];

assert.deepEqual(
  filterElderlyStatusQuestions(questions).map(item => item.id),
  [32, 33]
);
assert.deepEqual(
  filterNonElderlyStatusQuestions(questions).map(item => item.id),
  [50]
);

assert.equal(isAnswerFilled(""), false);
assert.equal(isAnswerFilled("بله"), true);
assert.equal(isAnswerFilled(["a"]), true);
assert.equal(isAnswerFilled([]), false);

const saved = answersMapFromRows([
  { question_id: 32, answer: "بدون کمک" },
  { question_id: 33, answer: '["روز"]' }
]);
assert.equal(saved.get(32), "بدون کمک");
assert.deepEqual(parseElderlyAnswer('["روز"]'), ["روز"]);
assert.equal(serializeElderlyAnswer(["روز"]), '["روز"]');

assert.equal(isElderlyStatusComplete(questions, saved), true);
assert.equal(isElderlyStatusComplete(questions, new Map()), false);

// Conditional 33 hidden when 32 != با کمک → complete with only 32
assert.equal(
  isElderlyStatusComplete(questions, new Map([[32, "بدون کمک"]])),
  true
);

// Optional elderly question (is_required "0") must not block completion
assert.equal(
  isElderlyStatusComplete(
    [
      {
        id: 90,
        question_text: "یادداشت",
        type: "textarea",
        category_id: 3,
        category_title: "وضعیت سالمند",
        is_active: 1,
        is_required: "0"
      }
    ],
    new Map()
  ),
  true
);

const payload = buildElderlyStatusSavePayload(questions, [
  { answers: "بدون کمک" },
  { answers: "" },
  { answers: "x" }
]);
assert.deepEqual(
  payload.map(row => row.question_id),
  [32, 33]
);

assert.equal(
  resolveElderlyForUserId({
    recipientMode: "other",
    companion: { linked_user_id: 200 }
  }),
  200
);
assert.equal(
  resolveElderlyForUserId({
    recipientMode: "self",
    profile: { id: 9 }
  }),
  9
);

assert.equal(elderlySummaryLabel({ question_text: "چطور راه می رود؟" }), "وضعیت حرکتی");
assert.equal(elderlySummaryLabel({ question_text: "پوشک استفاده می‌کند؟" }), "پوشک");
assert.equal(
  elderlySummaryLabel({ question_text: "بیماری یا مشکل خاص دارد؟" }),
  "بیماری‌ها"
);
assert.equal(formatElderlyAnswerDisplay(["آلزایمر", "دیابت"]), "آلزایمر، دیابت");

const summaryRows = buildElderlySummaryRows(
  questions,
  new Map([
    [32, "با کمک"],
    [33, "دارد"]
  ]),
  { addressLine: "تهران، سعادت‌آباد" }
);
assert.deepEqual(
  summaryRows.map(row => [row.label, row.value]),
  [
    ["وضعیت حرکتی", "با کمک"],
    ["پوشک", "دارد"],
    ["آدرس", "تهران، سعادت‌آباد"]
  ]
);

const flow = fs.readFileSync(
  new URL("../components/nurseRequest/NurseRequestFlow.tsx", import.meta.url),
  "utf8"
);
assert.match(flow, /elderlyStatus/);
assert.match(flow, /elderlySummary/);
assert.match(flow, /PUBLIC_ROUTES\.elderlyStatus/);
assert.match(flow, /PUBLIC_ROUTES\.elderlyStatusUpdate/);
assert.match(flow, /isElderlyStatusComplete/);
assert.match(flow, /skipElderlyIfCompleteRef/);
assert.match(flow, /elderlyFilledThisSessionRef/);
assert.match(flow, /saveElderlyStatusAnswers/);
assert.match(flow, /هنوز همین‌طور است؟/);
assert.match(flow, /وضعیت سالمند/);
assert.match(flow, /isQuestionRequired/);
assert.doesNotMatch(
  flow,
  /Boolean\(question\.is_required\)\s*\|\|\s*isElderlyStatusQuestion/
);

const model = fs.readFileSync(
  new URL("../components/nurseRequest/nurseRequestModel.ts", import.meta.url),
  "utf8"
);
assert.match(model, /"elderlyStatus"/);
assert.match(model, /"elderlySummary"/);

const routes = fs.readFileSync(
  new URL("../src/lib/apiRoutes.ts", import.meta.url),
  "utf8"
);
assert.match(routes, /elderlyStatus:\s*"elderly-status"/);
assert.match(routes, /elderlyStatusUpdate:\s*"elderly-status\/update"/);

console.log("elderly-status checks passed");
