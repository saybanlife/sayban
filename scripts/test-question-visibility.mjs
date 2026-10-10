/**
 * Conditional question visibility helpers.
 *
 *   npx tsx scripts/test-question-visibility.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  answerMatchesOption,
  getAnswerByQuestionId,
  isQuestionVisible,
  normalizeShowIfPayload,
  parseShowIfRule,
  shouldShowCategoryHeading
} from "../components/questions/questionVisibility.ts";

assert.equal(answerMatchesOption("خانم", "خانم"), true);
assert.equal(answerMatchesOption("آقا", "خانم"), false);
assert.equal(answerMatchesOption(["A", "B"], "B"), true);
assert.equal(answerMatchesOption(["A"], "B"), false);
assert.equal(answerMatchesOption(true, "true"), true);
assert.equal(answerMatchesOption(false, "true"), false);

const questions = [
  { id: 1, question_text: "جنسیت", type: "single_choice" },
  {
    id: 2,
    question_text: "بارداری",
    type: "single_choice",
    show_if_question_id: 1,
    show_if_option: "خانم",
    category_id: 10,
    category_title: "سلامت"
  },
  {
    id: 3,
    question_text: "جزئیات",
    type: "text",
    show_if_question_id: 2,
    show_if_option: "بله",
    category_id: 10,
    category_title: "سلامت"
  },
  { id: 4, question_text: "همیشه", type: "text", category_id: 10, category_title: "سلامت" }
];

const answers = [
  { answers: "خانم" },
  { answers: "بله" },
  { answers: "متن" },
  { answers: "x" }
];

const getAnswer = id => getAnswerByQuestionId(questions, answers, id);

assert.equal(isQuestionVisible(questions[0], questions, getAnswer), true);
assert.equal(isQuestionVisible(questions[1], questions, getAnswer), true);
assert.equal(isQuestionVisible(questions[2], questions, getAnswer), true);
assert.equal(
  isQuestionVisible({ ...questions[0], is_active: 0 }, questions, getAnswer),
  false
);

answers[0].answers = "آقا";
assert.equal(isQuestionVisible(questions[1], questions, getAnswer), false);
assert.equal(isQuestionVisible(questions[2], questions, getAnswer), false);

answers[0].answers = "خانم";
answers[1].answers = "خیر";
assert.equal(isQuestionVisible(questions[1], questions, getAnswer), true);
assert.equal(isQuestionVisible(questions[2], questions, getAnswer), false);

const visibleFlags = questions.map(q =>
  isQuestionVisible(q, questions, getAnswer)
);
assert.equal(
  shouldShowCategoryHeading(questions[1], questions, 1, i => visibleFlags[i]),
  true
);
assert.equal(
  shouldShowCategoryHeading(questions[3], questions, 3, i => visibleFlags[i]),
  false
);

assert.deepEqual(parseShowIfRule({ show_if_question_id: "2", show_if_option: " بله " }), {
  questionId: 2,
  option: "بله"
});
assert.deepEqual(
  normalizeShowIfPayload({ id: 9, show_if_question_id: 9, show_if_option: "x" }),
  { show_if_question_id: null, show_if_option: null }
);
assert.deepEqual(
  normalizeShowIfPayload({
    id: 3,
    show_if_question_id: 1,
    show_if_option: "خانم"
  }),
  { show_if_question_id: 1, show_if_option: "خانم" }
);

const pageCss = fs.readFileSync(
  "components/MainPageQuestion.module.css",
  "utf8"
);
assert.match(pageCss, /\.conditionBox\s*\{/);
const pageTsx = fs.readFileSync("components/MainPageQuestion.tsx", "utf8");
assert.match(pageTsx, /show_if_question_id/);
assert.match(pageTsx, /شرط نمایش/);
const offers = fs.readFileSync(
  "components/plasmic/sayban/PlasmicCenterOffers.tsx",
  "utf8"
);
assert.match(offers, /isQuestionVisible/);
assert.match(offers, /_hidden/);
assert.match(offers, /\.filter\(i =>/);

console.log("ok   question visibility");
