import assert from "node:assert/strict";
import {
  CARE_NEEDS_CATEGORY_TITLE,
  NURSING_NEEDS_CATEGORY_TITLE,
  isCareNeedsQuestion,
  isInScopeRequestQuestion,
  isNursingNeedsQuestion,
  isOtherRequestQuestion,
  isPrimaryRequestQuestion,
  isOppositeRoleNeedsQuestion,
  roleNeedsCategoryTitle
} from "../components/questions/roleNeedsModel.ts";

const care = {
  id: 1,
  category_id: 4,
  category_title: CARE_NEEDS_CATEGORY_TITLE
};
const nursing = {
  id: 2,
  category_id: 5,
  category_title: NURSING_NEEDS_CATEGORY_TITLE
};
const other = {
  id: 3,
  category_id: 9,
  category_title: "اطلاعات تکمیلی"
};
const elderly = {
  id: 4,
  category_id: 3,
  category_title: "وضعیت سالمند"
};

assert.equal(isCareNeedsQuestion(care), true);
assert.equal(isNursingNeedsQuestion(nursing), true);
assert.equal(isCareNeedsQuestion({ category_id: 4 }), true);
assert.equal(isNursingNeedsQuestion({ category_id: 5 }), true);
assert.equal(roleNeedsCategoryTitle("nurse"), NURSING_NEEDS_CATEGORY_TITLE);
assert.equal(roleNeedsCategoryTitle("caregiver"), CARE_NEEDS_CATEGORY_TITLE);

assert.equal(isPrimaryRequestQuestion(care, "caregiver"), true);
assert.equal(isPrimaryRequestQuestion(nursing, "caregiver"), false);
assert.equal(isPrimaryRequestQuestion(other, "caregiver"), false);
assert.equal(isPrimaryRequestQuestion(nursing, "nurse"), true);
assert.equal(isPrimaryRequestQuestion(care, "nurse"), false);

assert.equal(isOppositeRoleNeedsQuestion(nursing, "caregiver"), true);
assert.equal(isOppositeRoleNeedsQuestion(care, "nurse"), true);

assert.equal(isOtherRequestQuestion(other, "caregiver"), true);
assert.equal(isOtherRequestQuestion(nursing, "caregiver"), false);
assert.equal(isOtherRequestQuestion(care, "caregiver"), false);
assert.equal(isOtherRequestQuestion(elderly, "caregiver"), false);

assert.equal(isPrimaryRequestQuestion(care, "unsure"), true);
assert.equal(isPrimaryRequestQuestion(nursing, "unsure"), true);
assert.equal(isOtherRequestQuestion(other, "unsure"), true);

assert.equal(isInScopeRequestQuestion(care, "caregiver"), true);
assert.equal(isInScopeRequestQuestion(nursing, "caregiver"), false);
assert.equal(isInScopeRequestQuestion(other, "caregiver"), true);
assert.equal(isInScopeRequestQuestion(nursing, "nurse"), true);
assert.equal(isInScopeRequestQuestion(care, "nurse"), false);

console.log("role-needs model checks passed");
