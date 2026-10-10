import assert from "node:assert/strict";
import {
  buildFormPageSteps,
  groupQuestions,
  groupQuestionsByPage,
  isQuestionActive,
  isQuestionRequired,
  maxFormPageInCategory,
  nextQuestionSortOrder,
  normalizeFormPage,
  parseNumberQuestionConfig,
  parseQuestionOptions,
  parseTextQuestionConfig,
  serializeTextQuestionOptions,
  planQuestionReorder
} from "../components/questions/questionCategories.ts";
import {
  normalizeChoiceOptions,
  formatChoiceEditorLines,
  parseChoiceEditorLines,
  toggleMultipleAnswer,
  validateNumberAnswer
} from "../components/questions/questionAnswerModel.ts";

assert.deepEqual(parseQuestionOptions('["الف"," ب ",""]'), ["الف", "ب"]);
assert.deepEqual(parseQuestionOptions(["یک", " دو "]), ["یک", "دو"]);
assert.deepEqual(parseQuestionOptions("invalid"), []);
assert.deepEqual(parseNumberQuestionConfig('{"min":0,"max":20,"step":2}'), {
  min: 0,
  max: 20,
  step: 2
});
assert.deepEqual(parseNumberQuestionConfig("invalid"), {});
assert.deepEqual(
  parseTextQuestionConfig('{"placeholder":"مثلاً دیابت دارد...","help":"راهنما"}'),
  { placeholder: "مثلاً دیابت دارد...", help: "راهنما" }
);
assert.deepEqual(parseTextQuestionConfig("[]"), {});
assert.deepEqual(
  serializeTextQuestionOptions({
    placeholder: "  مثلاً دیابت دارد...  ",
    help: ""
  }),
  { placeholder: "مثلاً دیابت دارد..." }
);
assert.deepEqual(normalizeChoiceOptions('["تزریقات","پانسمان"]'), [
  { value: "تزریقات", label: "تزریقات" },
  { value: "پانسمان", label: "پانسمان" }
]);
assert.deepEqual(
  normalizeChoiceOptions([
    { value: "8", label: "۸ ساعته", description: "یک شیفت اداری" }
  ]),
  [{ value: "8", label: "۸ ساعته", description: "یک شیفت اداری" }]
);
assert.deepEqual(toggleMultipleAnswer(["الف"], "ب"), ["الف", "ب"]);
assert.deepEqual(toggleMultipleAnswer(["الف", "ب"], "الف"), ["ب"]);
assert.deepEqual(parseChoiceEditorLines("۸ ساعته | یک شیفت اداری\n۱۲ ساعته"), [
  { value: "۸ ساعته", label: "۸ ساعته", description: "یک شیفت اداری" },
  "۱۲ ساعته"
]);
assert.equal(
  formatChoiceEditorLines('[{"value":"8","label":"۸ ساعته","description":"یک شیفت اداری"}]'),
  "۸ ساعته | یک شیفت اداری"
);
assert.deepEqual(validateNumberAnswer("3", { min: 1, max: 5 }, true), {
  value: "3"
});
assert.equal(validateNumberAnswer("0", { min: 1 }, true).value, "");
assert.equal(validateNumberAnswer("6", { max: 5 }, true).value, "");
assert.equal(validateNumberAnswer("3", { min: 0, step: 2 }, true).value, "");
assert.equal(validateNumberAnswer("", {}, true).error, "وارد کردن مقدار الزامی است.");

const questions = [
  {
    id: 1,
    question_text: "قد",
    type: "text",
    category_id: 2,
    form_page: 1,
    sort_order: 20,
    category_title: "اطلاعات جسمی"
  },
  {
    id: 2,
    question_text: "نام",
    type: "text",
    category_id: null,
    form_page: 1,
    sort_order: 5
  },
  {
    id: 3,
    question_text: "وزن",
    type: "text",
    category_id: 2,
    form_page: 1,
    sort_order: 10,
    category_title: "اطلاعات جسمی"
  },
  {
    id: 4,
    question_text: "قدیمی",
    type: "text",
    category_id: 999,
    form_page: 1,
    sort_order: 1
  },
  {
    id: 5,
    question_text: "فشار",
    type: "text",
    category_id: 2,
    form_page: 2,
    sort_order: 10,
    category_title: "اطلاعات جسمی"
  },
  {
    id: 6,
    question_text: "سابقه",
    type: "text",
    category_id: 1,
    form_page: 1,
    sort_order: 10,
    category_title: "اطلاعات پایه"
  },
  {
    id: 7,
    question_text: "آلرژی",
    type: "text",
    category_id: 1,
    form_page: 2,
    sort_order: 10,
    category_title: "اطلاعات پایه"
  }
];
const categories = [
  { id: 2, title: "اطلاعات جسمی", sort_order: 20 },
  { id: 1, title: "اطلاعات پایه", sort_order: 10 }
];
const groups = groupQuestions(questions, categories);

assert.deepEqual(groups.map(group => group.category?.id ?? null), [1, 2, null]);
assert.deepEqual(groups[0].questions.map(item => item.id), [6, 7]);
assert.deepEqual(groups[1].questions.map(item => item.id), [3, 1, 5]);
assert.deepEqual(groups[2].questions.map(item => item.id), [4, 2]);

assert.equal(normalizeFormPage(undefined), 1);
assert.equal(normalizeFormPage(0), 1);
assert.equal(normalizeFormPage("3"), 3);
assert.equal(maxFormPageInCategory(questions, 2), 2);
assert.equal(maxFormPageInCategory(questions, 1), 2);

const pagesCat2 = groupQuestionsByPage(groups[1].questions);
assert.deepEqual(
  pagesCat2.map(page => [page.page, page.questions.map(item => item.id)]),
  [
    [1, [3, 1]],
    [2, [5]]
  ]
);

assert.equal(isQuestionActive({}), true);
assert.equal(isQuestionActive({ is_active: 1 }), true);
assert.equal(isQuestionActive({ is_active: 0 }), false);
assert.equal(isQuestionRequired({}), false);
assert.equal(isQuestionRequired({ is_required: 1 }), true);
assert.equal(isQuestionRequired({ is_required: "0" }), false);
assert.equal(isQuestionRequired({ is_required: 0 }), false);
assert.equal(isQuestionRequired({ is_required: "1" }), true);
assert.equal(nextQuestionSortOrder(questions), 21);

const reorder = planQuestionReorder(questions, categories, 3, 1);
assert.ok(reorder);
assert.deepEqual(
  reorder.map(item => item.id),
  [1, 3]
);
assert.equal(planQuestionReorder(questions, categories, 1, 1), null);
assert.equal(planQuestionReorder(questions, categories, 5, 1), null);

const ordered = [
  questions[5],
  questions[6],
  questions[2],
  questions[0],
  questions[4],
  questions[3],
  questions[1]
];
const steps = buildFormPageSteps(ordered, () => true);
assert.deepEqual(
  steps.map(step => [step.categoryId, step.page, step.indexes.length]),
  [
    [1, 1, 1],
    [1, 2, 1],
    [2, 1, 2],
    [2, 2, 1],
    [999, 1, 1],
    [null, 1, 1]
  ]
);
assert.equal(steps[0].page, 1);
assert.equal(steps[2].page, 1);
assert.equal(steps[1].page, 2);
assert.equal(steps[3].page, 2);

console.log("question category checks passed");
