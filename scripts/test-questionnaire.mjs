/**
 * Unit tests for the questionnaire helpers:
 *   components/reservation/questionnaireAutofill.ts
 *   components/reservations/questionnaireAnswers.ts
 *
 *   npx tsx scripts/test-questionnaire.mjs
 */
import {
  autofillAnswerFor,
  isAutofillableQuestion,
  resolveBookingPerson
} from "../components/reservation/questionnaireAutofill.ts";
import {
  formatQuestionnaireAnswer,
  formatQuestionnaireLabel,
  parseQuestionnaireAnswers
} from "../components/reservations/questionnaireAnswers.ts";

let failures = 0;
function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`ok   ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL ${name}\n  expected ${e}\n  actual   ${a}`);
  }
}

// The 8 live rows of centers__question.
const Q = {
  gender: {
    question_text: "جنسیت خدمت‌گیرنده",
    type: "single_choice",
    options: '["خانم","آقا"]'
  },
  nurseGender: {
    question_text: "جنسیت ترجیحی پرستار",
    type: "single_choice",
    options: '["خانم","آقا","تفاوتی ندارد"]'
  },
  date: { question_text: "تاریخ مورد نیاز جهت شروع خدمت", type: "date" },
  time: { question_text: "ساعت مورد نیاز جهت شروع خدمت", type: "time" },
  duration: {
    question_text: "مدت خدمت",
    type: "single_choice",
    options: '["ساعتی","نیم‌روز"]'
  },
  address: { question_text: "منطقه و آدرس محل خدمت", type: "address" },
  notes: { question_text: "توضیحات تکمیلی", type: "textarea" },
  phoneConsult: {
    question_text: "نیاز به مشاوره تلفنی",
    type: "checkbox",
    options: '["برای انتخاب خدمت مناسب به مشاوره تلفنی نیاز دارم"]'
  },
  // Questions an admin could add later.
  nationalId: { question_text: "کد ملی", type: "text" },
  name: { question_text: "نام و نام خانوادگی", type: "text" },
  mobile: { question_text: "شماره تماس", type: "text" }
};

const COMPANION = {
  id: 4,
  name: "مریم رضایی",
  national_code: "0079876543",
  mobile: "09121112233",
  gender: "female",
  relation: "mother",
  city: "تهران",
  address: "خیابان ولیعصر، پلاک ۱۰",
  details: "واحد ۳",
  postal_code: "1234567890",
  latitude: 35.7,
  longitude: 51.4
};

const PROFILE = {
  id: 2,
  first_name: "علی",
  last_name: "احمدی",
  national_code: "0012345678",
  phone: "09120000000",
  gender: "male",
  city: "کرج"
};

// --- resolveBookingPerson ---------------------------------------------------
check(
  "person: companion wins over profile",
  resolveBookingPerson(COMPANION, PROFILE)?.name,
  "مریم رضایی"
);
check(
  "person: falls back to profile for \u00abfor myself\u00bb",
  resolveBookingPerson({}, PROFILE)?.name,
  "علی احمدی"
);
check("person: profile phone maps to mobile", resolveBookingPerson({}, PROFILE)?.mobile, "09120000000");
check("person: nothing loaded", resolveBookingPerson({}, undefined), null);
check("person: nulls", resolveBookingPerson(null, null), null);

// --- which questions are owned by autofill ---------------------------------
check("owns: recipient gender", isAutofillableQuestion(Q.gender), true);
check("owns: NOT preferred nurse gender", isAutofillableQuestion(Q.nurseGender), false);
check("owns: NOT duration", isAutofillableQuestion(Q.duration), false);
check("owns: NOT date", isAutofillableQuestion(Q.date), false);
check("owns: NOT time", isAutofillableQuestion(Q.time), false);
check("owns: NOT phone consultation", isAutofillableQuestion(Q.phoneConsult), false);
check("owns: NOT free-text notes", isAutofillableQuestion(Q.notes), false);
check("owns: address", isAutofillableQuestion(Q.address), true);
check("owns: national id", isAutofillableQuestion(Q.nationalId), true);
check("owns: name", isAutofillableQuestion(Q.name), true);
check("owns: mobile", isAutofillableQuestion(Q.mobile), true);

// --- values ----------------------------------------------------------------
const companion = resolveBookingPerson(COMPANION, PROFILE);
const self = resolveBookingPerson({}, PROFILE);

check("fill: female gender -> \u062e\u0627\u0646\u0645", autofillAnswerFor(Q.gender, companion), "خانم");
check("fill: male gender -> \u0622\u0642\u0627", autofillAnswerFor(Q.gender, self), "آقا");
check(
  "fill: gender respects the question's own wording",
  autofillAnswerFor(
    { question_text: "جنسیت", type: "single_choice", options: '["زن","مرد"]' },
    companion
  ),
  "زن"
);
check(
  "fill: unknown gender left blank",
  autofillAnswerFor(Q.gender, { gender: "other" }),
  undefined
);
check("fill: preferred nurse gender left blank", autofillAnswerFor(Q.nurseGender, companion), undefined);
check("fill: duration left blank", autofillAnswerFor(Q.duration, companion), undefined);
check("fill: date left blank", autofillAnswerFor(Q.date, companion), undefined);
check("fill: checkbox left blank", autofillAnswerFor(Q.phoneConsult, companion), undefined);
check("fill: national id", autofillAnswerFor(Q.nationalId, companion), "0079876543");
check("fill: leading zero kept", autofillAnswerFor(Q.nationalId, self), "0012345678");
check("fill: name", autofillAnswerFor(Q.name, companion), "مریم رضایی");
check("fill: mobile", autofillAnswerFor(Q.mobile, companion), "09121112233");
check("fill: address object", autofillAnswerFor(Q.address, companion), {
  city: "تهران",
  address: "خیابان ولیعصر، پلاک ۱۰",
  details: "واحد ۳",
  postal_code: "1234567890",
  latitude: 35.7,
  longitude: 51.4
});
check(
  "fill: address skipped when the person has none",
  autofillAnswerFor(Q.address, self),
  undefined
);
check("fill: no person -> nothing", autofillAnswerFor(Q.gender, null), undefined);

// --- panel display ---------------------------------------------------------
check(
  "display: phone consultation checked",
  formatQuestionnaireAnswer({ ...Q.phoneConsult, answer: true }),
  "بله"
);
check(
  "display: phone consultation unchecked",
  formatQuestionnaireAnswer({ ...Q.phoneConsult, answer: false }),
  "خیر"
);
check(
  "display: phone consultation never touched",
  formatQuestionnaireAnswer({ ...Q.phoneConsult, answer: "" }),
  "خیر"
);
check(
  "display: checkbox sent as string true",
  formatQuestionnaireAnswer({ ...Q.phoneConsult, answer: "true" }),
  "بله"
);
check(
  "display: label gets a colon",
  formatQuestionnaireLabel(Q.phoneConsult),
  "نیاز به مشاوره تلفنی:"
);
check(
  "display: label colon not doubled",
  formatQuestionnaireLabel({ question_text: "کد ملی:" }),
  "کد ملی:"
);
check(
  "display: time object",
  formatQuestionnaireAnswer({ ...Q.time, answer: { hour: 8, minute: 5 } }),
  "08:05"
);
check(
  "display: date object",
  formatQuestionnaireAnswer({ ...Q.date, answer: { year: 1405, month: 6, day: 9 } }),
  "1405/06/09"
);
check(
  "display: address object",
  formatQuestionnaireAnswer({ ...Q.address, answer: { city: "تهران", address: "ولیعصر" } }),
  "تهران، ولیعصر"
);
check(
  "display: plain text passes through",
  formatQuestionnaireAnswer({ ...Q.notes, answer: "بعد از ظهر" }),
  "بعد از ظهر"
);
check("display: empty text", formatQuestionnaireAnswer({ ...Q.notes, answer: "" }), "");
check(
  "display: multi select array",
  formatQuestionnaireAnswer({ question_text: "خدمات", type: "multiple_choice", answer: ["تزریقات", "پانسمان"] }),
  "تزریقات، پانسمان"
);
check("display: null item", formatQuestionnaireAnswer(null), "");
check(
  "display: stray boolean on a non-checkbox",
  formatQuestionnaireAnswer({ ...Q.notes, answer: false }),
  "خیر"
);

// --- parsing ---------------------------------------------------------------
check("parse: json string", parseQuestionnaireAnswers('[{"id":1}]'), [{ id: 1 }]);
check("parse: already an array", parseQuestionnaireAnswers([{ id: 1 }]), [{ id: 1 }]);
check("parse: empty string", parseQuestionnaireAnswers(""), []);
check("parse: null", parseQuestionnaireAnswers(null), []);
check("parse: malformed json", parseQuestionnaireAnswers("{not json"), []);
check("parse: json object, not array", parseQuestionnaireAnswers('{"a":1}'), []);

console.log(
  failures === 0 ? "\nall questionnaire checks passed" : `\n${failures} failure(s)`
);
process.exit(failures === 0 ? 0 : 1);
