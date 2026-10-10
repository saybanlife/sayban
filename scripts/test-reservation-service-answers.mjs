import assert from "node:assert/strict";
import {
  buildReservationServiceAnswerRows,
  formatSelectedServiceNames,
  formatSelectedServiceType,
  localizeServiceCategory,
  mergeQuestionnaireWithServiceRows
} from "../components/reservations/reservationServiceAnswers.ts";

assert.equal(localizeServiceCategory("general"), "عمومی");
assert.equal(localizeServiceCategory("specialized"), "تخصصی");

const generalRes = {
  services: [
    { id: 1, name: "کمک در غذاخوردن", category: "general" },
    { id: 2, name: "تعویض پوشک", category: "general" }
  ]
};
assert.equal(
  formatSelectedServiceNames(generalRes),
  "کمک در غذاخوردن، تعویض پوشک"
);
assert.equal(formatSelectedServiceType(generalRes), "عمومی");

const specializedRes = {
  services: [
    { id: 95, name: "تزریق آمپول", category: "specialized" },
    { id: 96, name: "تزریق وریدی", category: "specialized" }
  ]
};
assert.equal(formatSelectedServiceType(specializedRes), "تخصصی");

const visitRes = {
  service_name: "رزرو وقت مشاوره و بازدید",
  services: [{ id: 126, name: "رزرو وقت مشاوره و بازدید", category: null }]
};
assert.equal(
  formatSelectedServiceNames(visitRes),
  "رزرو وقت مشاوره و بازدید"
);
assert.equal(formatSelectedServiceType(visitRes), "");

const rows = buildReservationServiceAnswerRows(generalRes);
assert.equal(rows.length, 2);
assert.equal(rows[0].question_text, "خدمات انتخاب‌شده");
assert.equal(rows[1].question_text, "نوع خدمات");

const merged = mergeQuestionnaireWithServiceRows(generalRes, [
  { question_text: "ساعت مورد نیاز", type: "time", answer: { hour: 10, minute: 0 } }
]);
assert.equal(merged.length, 3);
assert.equal(merged[0].question_text, "خدمات انتخاب‌شده");

const deduped = mergeQuestionnaireWithServiceRows(generalRes, [
  { question_text: "خدمات انتخاب‌شده:", type: "text", answer: "x" }
]);
assert.equal(deduped.filter(r => String(r.question_text).includes("خدمات انتخاب")).length, 1);

console.log("reservationServiceAnswers ok");
