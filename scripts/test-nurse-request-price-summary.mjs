import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const read = relative =>
  fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");

async function loadBundled(sources) {
  const joined = sources.join("\n");
  const output = ts.transpileModule(joined, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  return import(
    `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`
  );
}

const modelSrc = read("components/nurseRequest/nurseRequestModel.ts");
const summarySrc = read("components/nurseRequest/requestSummaryModel.ts")
  .replace(
    /import[\s\S]*?from\s+".\/nurseRequestModel";\s*/,
    ""
  );
const priceSrc = read("components/nurseRequest/priceEstimateModel.ts");

const price = await loadBundled([priceSrc]);
const summary = await loadBundled([modelSrc, summarySrc]);

const once = price.estimateNurseRequestPrice({
  duration: "once",
  role: "caregiver",
  serviceLabels: ["همراه بیمارستان"],
  answers: { "ساعت کار": "شیفت شب ۱۲ ساعت" },
  shiftHours: 12
});
assert.ok(once);
assert.equal(once.heading, "قیمت معمول این خدمت");
assert.ok(once.min >= 900_000);
assert.ok(once.max >= once.min);
assert.match(price.estimateDisplayRange(once), /تومان/);

const continuousCaregiver = price.estimateNurseRequestPrice({
  duration: "continuous",
  role: "caregiver",
  answers: { کارها: "مراقبت و کارهای خانه، ۳ نفر" }
});
assert.ok(continuousCaregiver);
assert.equal(continuousCaregiver.heading, "قیمت معمول ماهانه");
assert.ok(continuousCaregiver.min >= 28_000_000);

const continuousNurse = price.estimateNurseRequestPrice({
  duration: "continuous",
  role: "nurse",
  answers: { "ساعت کار": "ویزیت روزانه ۱ تا ۲ ساعت" }
});
assert.ok(continuousNurse);
assert.ok(continuousNurse.min >= 10_000_000);
assert.ok(continuousNurse.max <= 18_000_000);

const rowsOnce = summary.buildRequestSummaryRows({
  personName: "مادربزرگ فاطمه",
  recipientMode: "other",
  duration: "once",
  role: "caregiver",
  selectedServices: [{ id: 1, name: "همراه بیمارستان" }],
  answerPairs: [
    { label: "ساعت کار", value: "شیفت شب ۱۲ ساعت" },
    { label: "زمان", value: "شنبه ۲ مهر از ساعت ۱۹" },
    { label: "مکان", value: "بیمارستان شریعتی" }
  ]
});
assert.ok(rowsOnce.some(row => row.label === "برای"));
assert.ok(rowsOnce.some(row => row.label === "خدمت"));
assert.ok(rowsOnce.every(row => row.editStep));

const rowsContinuous = summary.buildRequestSummaryRows({
  personName: "مادربزرگ فاطمه",
  recipientMode: "other",
  duration: "continuous",
  role: "nurse",
  selectedServices: [],
  answerPairs: [
    { label: "ساعت کار", value: "ویزیت روزانه ۱ تا ۲ ساعت از ۸ صبح" },
    { label: "کارهای پرستاری", value: "تزریق، پانسمان" },
    { label: "شروع", value: "شنبه ۲ مهر ۱۴۰۵" },
    { label: "آدرس", value: "تهران، ونک" },
    { label: "ترجیح", value: "مهم نیست" }
  ]
});
assert.ok(rowsContinuous.some(row => row.label === "نوع"));
assert.ok(rowsContinuous.some(row => row.label === "کارهای پرستاری"));

const success = summary.buildSubmitSuccessCopy(new Date(2026, 9, 6, 14, 0));
assert.match(success.title, /ثبت شد/);
assert.match(success.detail, /۱۴/);

const afterHours = summary.buildSubmitSuccessCopy(new Date(2026, 9, 6, 19, 0));
assert.match(afterHours.subtitle, /خارج از ساعت/);

console.log("Nurse request price/summary tests passed.");
