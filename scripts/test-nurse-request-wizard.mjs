import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";

const read = relative =>
  fs.readFileSync(new URL(`../${relative}`, import.meta.url), "utf8");

const modelSource = read("components/nurseRequest/nurseRequestModel.ts");
const modelOutput = ts.transpileModule(modelSource, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 }
}).outputText;
const model = await import(
  `data:text/javascript;base64,${Buffer.from(modelOutput).toString("base64")}`
);

assert.deepEqual(
  model.filterServicesByRole(
    [
      { id: 1, category: "general", name: "حمام" },
      { id: 2, category: "specialized", name: "تزریق" }
    ],
    "nurse"
  ).map(item => item.id),
  [2]
);
assert.equal(model.roleLabel("caregiver"), "مراقب");
assert.equal(model.durationLabel("continuous"), "مداوم");
assert.match(
  model.summaryLine({
    personName: "مادربزرگ فاطمه",
    duration: "continuous",
    role: "nurse"
  }),
  /مادربزرگ فاطمه/
);
assert.equal(
  model.companionDisplayName({
    name: "فاطمه",
    relation_persian: "مادربزرگ"
  }),
  "مادربزرگ فاطمه"
);

// Progress: fill only from real answers, not mere step entry
assert.equal(
  model.nurseRequestFilledStageCount({
    step: "elderlyStatus",
    recipientMode: "self",
    duration: null,
    role: null,
    selectedServiceIds: []
  }),
  0
);
assert.equal(model.nurseRequestCurrentStageLabel("elderlyStatus"), 1);
assert.equal(
  model.nurseRequestFilledStageCount({
    step: "services",
    recipientMode: "self",
    duration: "once",
    role: "nurse",
    selectedServiceIds: []
  }),
  1
);
assert.equal(model.nurseRequestCurrentStageLabel("services"), 2);
assert.equal(
  model.nurseRequestFilledStageCount({
    step: "questions",
    recipientMode: "self",
    duration: "once",
    role: "nurse",
    selectedServiceIds: [10]
  }),
  2
);
assert.equal(
  model.nurseRequestFilledStageCount({
    step: "summary",
    recipientMode: "self",
    duration: "once",
    role: "nurse",
    selectedServiceIds: [10]
  }),
  3
);
assert.equal(
  model.nurseRequestFilledStageCount({
    step: "companion",
    recipientMode: "other",
    selectedCompanionId: null,
    duration: "once",
    role: "caregiver",
    selectedServiceIds: []
  }),
  0
);

const categoriesSource = read("components/questions/questionCategories.ts");
const categoriesOutput = ts.transpileModule(categoriesSource, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 }
}).outputText;
const categories = await import(
  `data:text/javascript;base64,${Buffer.from(categoriesOutput).toString("base64")}`
);
assert.equal(categories.isQuestionRequired({ is_required: "0" }), false);
assert.equal(categories.isQuestionRequired({ is_required: 0 }), false);
assert.equal(categories.isQuestionRequired({ is_required: "1" }), true);
assert.equal(categories.isQuestionRequired({ is_required: 1 }), true);
assert.equal(categories.isQuestionRequired({ is_required: true }), true);
assert.equal(categories.isQuestionRequired({}), false);

const flow = read("components/nurseRequest/NurseRequestFlow.tsx");
assert.match(flow, /مراقبت برای چه کسی است؟/);
assert.match(flow, /این خدمت یک بار است یا مداوم؟/);
assert.match(flow, /کدام را لازم دارید؟/);
assert.match(flow, /افزودن همراه/);
assert.match(flow, /userNew/);
assert.match(flow, /\/reservations\/steff2/);
assert.match(flow, /AnswersUser/);
assert.match(flow, /listCompanions/);
assert.match(flow, /from \"\.\.\/Header\"/);
assert.match(flow, /search=\{false\}/);
assert.match(flow, /back=\{goBack\}/);
assert.match(flow, /slot=\{headerTitle\}/);
assert.match(flow, /elderlyStatus/);
assert.match(flow, /isElderlyStatusComplete/);
assert.match(flow, /isQuestionRequired/);
assert.match(flow, /nurseRequestFilledStageCount/);
assert.match(flow, /nurseRequestCurrentStageLabel/);
assert.match(flow, /filledStageCount/);
assert.match(flow, /filterStaffServicesForRequest/);
assert.match(modelSource, /filterStaffServicesForRequest/);
assert.match(modelSource, /duration_mode/);
assert.doesNotMatch(
  flow,
  /Boolean\(question\.is_required\)\s*\|\|\s*isElderlyStatusQuestion/
);
assert.match(flow, /PUBLIC_ROUTES\.elderlyStatusUpdate/);
assert.match(flow, /elderlySummary/);
assert.match(flow, /هنوز همین‌طور است؟/);
assert.match(flow, /بله، همین‌طور است/);
assert.match(flow, /elderlyFilledThisSessionRef/);
assert.match(flow, /SupportCallbackDialog/);
assert.match(flow, /PlasmicIcon__User/);
assert.match(flow, /PlasmicIcon__InfoCircle/);
assert.match(flow, /PlasmicIcon__Phone/);
assert.match(flow, /PlasmicIcon__Check/);
assert.match(flow, /PlasmicIcon__CircleCheck/);
assert.match(flow, /PlasmicIcon__Clock/);
assert.match(flow, /PlasmicIcon__MedicalCross/);
assert.match(flow, /PlasmicIcon__Headphones/);
assert.doesNotMatch(flow, /icon="👤"/);
assert.doesNotMatch(flow, /icon="♡"/);
assert.doesNotMatch(flow, /icon="🎧"/);
assert.doesNotMatch(flow, />☎</);
assert.doesNotMatch(flow, />ⓘ</);

assert.match(modelSource, /"elderlyStatus"/);
assert.match(modelSource, /"elderlySummary"/);
assert.match(modelSource, /"supportCallbackSuccess"/);
assert.match(modelSource, /"otherQuestions"/);
assert.match(modelSource, /"summary"/);
assert.match(modelSource, /"submitSuccess"/);

assert.match(flow, /isPrimaryRequestQuestion/);
assert.match(flow, /isOtherRequestQuestion/);
assert.match(flow, /otherQuestions/);
assert.match(flow, /roleNeedsCategoryTitle/);
assert.match(flow, /isFinalQuestionsStep/);
assert.match(flow, /خلاصه درخواست/);
assert.match(flow, /تأیید نهایی/);
assert.match(flow, /setStep\("summary"\)/);
assert.match(flow, /submitSuccess/);
assert.match(flow, /price-estimate/);
assert.match(flow, /buildRequestSummaryRows/);
assert.match(flow, /دیدن در درخواست‌های من/);

const summaryModel = read("components/nurseRequest/requestSummaryModel.ts");
assert.match(summaryModel, /buildRequestSummaryRows/);
assert.match(summaryModel, /buildSubmitSuccessCopy/);

const priceModel = read("components/nurseRequest/priceEstimateModel.ts");
assert.match(priceModel, /estimateNurseRequestPrice/);
assert.match(priceModel, /PLATFORM_NURSE_PRICING_DEFAULTS/);
assert.match(priceModel, /duration_mode/);
assert.match(priceModel, /factors/);

const panelWorkspace = read("components/centerPanel/CenterPanelWorkspace.tsx");
assert.match(panelWorkspace, /CenterNursePricingManager/);
assert.match(panelWorkspace, /قیمت‌گذاری مراقب \/ پرستار/);

const pricingManager = read(
  "components/centerPanel/CenterNursePricingManager.tsx"
);
assert.match(pricingManager, /\/api\/panel\/nurse-pricing/);
assert.match(pricingManager, /موردی \(یک‌بار\)/);
assert.match(pricingManager, /مستمر \(مداوم\)/);

const centerOffers = read("components/CenterOffers.tsx");
assert.match(centerOffers, /NurseRequestFlow/);
assert.doesNotMatch(centerOffers, /FragmentSelect/);

console.log("Nurse request wizard tests passed.");
