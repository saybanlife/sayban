import * as React from "react";
import { useRouter } from "next/router";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";

import AnswersUser from "../AnswersUser";
import Header from "../Header";
import { getNationalIdError } from "../formFieldRules";
import {
  autofillAnswerFor,
  isAutofillableQuestion,
  resolveBookingPerson
} from "../reservation/questionnaireAutofill";
import {
  getAnswerByQuestionId,
  isQuestionVisible
} from "../questions/questionVisibility";
import {
  buildFormPageSteps,
  compareFormPageOrder,
  categoryKeyOf,
  isQuestionRequired,
  type FormQuestion
} from "../questions/questionCategories";
import {
  answersMapFromRows,
  buildElderlyStatusSavePayload,
  buildElderlySummaryRows,
  filterElderlyStatusQuestions,
  isAnswerFilled,
  isElderlyStatusComplete,
  isElderlyStatusQuestion,
  parseElderlyAnswer,
  resolveElderlyForUserId
} from "../questions/elderlyStatusModel";
import {
  isInScopeRequestQuestion,
  isOtherRequestQuestion,
  isPrimaryRequestQuestion,
  roleNeedsCategoryTitle
} from "../questions/roleNeedsModel";
import SupportCallbackDialog from "../support/SupportCallbackDialog";
import {
  formatCompanionAddressLine,
  listCompanions,
  type CompanionRecord
} from "../user/patientAddressApi";
import { buildCompanionBookingFields } from "../user/companionUserModel";
import {
  PANEL_ROUTES,
  PUBLIC_ROUTES,
  resolveApiUrl
} from "../../src/lib/apiRoutes";
import { resolvePublicAuthToken } from "../../src/lib/publicAuthToken";
import { readCookie } from "../../src/lib/authCookies";
import styles from "./NurseRequestFlow.module.css";
import {
  clearWizardSnapshot,
  companionAgeLabel,
  companionDisplayName,
  durationLabel,
  faDigits,
  filterStaffServicesForRequest,
  normalizeQuestionsPayload,
  normalizeServicesPayload,
  nurseRequestCurrentStageLabel,
  nurseRequestFilledStageCount,
  readWizardSnapshot,
  roleLabel,
  serviceLabel,
  summaryLine,
  writeWizardSnapshot,
  type DurationMode,
  type RecipientMode,
  type RoleMode,
  type StaffService,
  type WizardStep
} from "./nurseRequestModel";
import {
  buildRequestSummaryRows,
  buildSubmitSuccessCopy,
  flattenAnswerPairs,
  inferShiftHoursFromAnswers,
  pairsToAnswerMap,
  type RequestSummaryRow
} from "./requestSummaryModel";
import {
  estimateDisplayRange,
  estimateNurseRequestPrice,
  PLATFORM_NURSE_PRICING_DEFAULTS,
  type PriceEstimateResult
} from "./priceEstimateModel";
import SupportAgentIcon from "../plasmic/sayban/icons/SupportAgentIcon";
import UserIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__User";
import UserHeartIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__UserHeart";
import HeartIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Heart";
import ClockIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Clock";
import MedicalCrossIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__MedicalCross";
import HeadphonesIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Headphones";
import InfoCircleIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__InfoCircle";
import PhoneIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Phone";
import CheckIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Check";
import CircleCheckIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__CircleCheck";

export type NurseRequestFlowProps = {
  token?: string;
  profile?: unknown;
  id?: string;
  userNew?: () => void;
  userSelectOpendialog?: boolean;
  onUserSelectOpendialogChange?: (val: boolean) => void;
  className?: string;
};

type AnswerRow = { data: FormQuestion; answers: unknown };

function authHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json"
  };
  const resolved = String(
    resolvePublicAuthToken(token || readCookie("token") || "") || ""
  ).trim();
  if (resolved) {
    headers.Authorization = `Bearer ${resolved}`;
  }
  return headers;
}

function profileDisplayName(profile: unknown) {
  if (!profile || typeof profile !== "object") return "خودم";
  const row = profile as Record<string, unknown>;
  const name =
    String(row.name || "").trim() ||
    [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  return name || "خودم";
}

function OptionCard({
  selected,
  title,
  description,
  icon,
  onClick,
  multi
}: {
  selected: boolean;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  onClick: () => void;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      className={selected ? styles.optionCardSelected : styles.optionCard}
      onClick={onClick}
      aria-pressed={selected}
    >
      {icon ? <span className={styles.optionIcon}>{icon}</span> : null}
      <span className={styles.optionCopy}>
        <span className={styles.optionTitle}>{title}</span>
        {description ? (
          <span className={styles.optionDesc}>{description}</span>
        ) : null}
      </span>
      {multi ? (
        <span className={styles.checkBox} aria-hidden>
          <CheckIcon className={styles.checkGlyph} />
        </span>
      ) : (
        <span className={styles.radio} aria-hidden />
      )}
    </button>
  );
}

export default function NurseRequestFlow({
  token,
  profile,
  id,
  userNew,
  userSelectOpendialog,
  onUserSelectOpendialogChange,
  className
}: NurseRequestFlowProps) {
  const router = useRouter();
  const $globalActions = useGlobalActions?.();
  const toast = React.useCallback(
    (type: "error" | "success", message: string) => {
      $globalActions?.["Fragment.showToast"]?.(type, message, "bottom-center");
    },
    [$globalActions]
  );

  const snapshot = React.useMemo(() => readWizardSnapshot(), []);
  const [step, setStep] = React.useState<WizardStep>(
    snapshot?.step || "recipient"
  );
  const [recipientMode, setRecipientMode] = React.useState<RecipientMode>(
    snapshot?.recipientMode ?? null
  );
  const [duration, setDuration] = React.useState<DurationMode>(
    snapshot?.duration ?? null
  );
  const [role, setRole] = React.useState<RoleMode>(snapshot?.role ?? null);
  const [selectedCompanion, setSelectedCompanion] =
    React.useState<CompanionRecord | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = React.useState<
    Array<number | string>
  >(snapshot?.selectedServiceIds || []);
  const [companions, setCompanions] = React.useState<CompanionRecord[]>([]);
  const [services, setServices] = React.useState<StaffService[]>([]);
  const [questions, setQuestions] = React.useState<FormQuestion[]>([]);
  const [answersUser, setAnswersUser] = React.useState<AnswerRow[]>([]);
  const [elderlySaved, setElderlySaved] = React.useState<Map<number, unknown>>(
    () => new Map()
  );
  const [elderlyGateChecked, setElderlyGateChecked] = React.useState(false);
  const [loadingPatients, setLoadingPatients] = React.useState(false);
  const [loadingServices, setLoadingServices] = React.useState(false);
  const [loadingQuestions, setLoadingQuestions] = React.useState(false);
  const [savingElderlyStatus, setSavingElderlyStatus] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [questionStepIndex, setQuestionStepIndex] = React.useState(0);
  const [supportCallbackOpen, setSupportCallbackOpen] = React.useState(false);
  const [priceEstimate, setPriceEstimate] =
    React.useState<PriceEstimateResult | null>(null);
  const [priceDisplayRange, setPriceDisplayRange] = React.useState("");
  const [submitSuccessCopy, setSubmitSuccessCopy] = React.useState(() =>
    buildSubmitSuccessCopy()
  );
  const skipElderlyIfCompleteRef = React.useRef(true);
  /** True when user saved وضعیت سالمند in this wizard run (before duration). */
  const elderlyFilledThisSessionRef = React.useRef(false);
  /** After ویرایش from summary, return to summary on save. */
  const returnToElderlySummaryRef = React.useRef(false);

  const selfName = profileDisplayName(profile);
  const personName =
    recipientMode === "other" && selectedCompanion
      ? companionDisplayName(selectedCompanion)
      : selfName;

  React.useEffect(() => {
    if (step === "submitSuccess" || step === "supportCallbackSuccess") {
      clearWizardSnapshot();
      return;
    }
    writeWizardSnapshot({
      step,
      recipientMode,
      duration,
      role,
      selectedServiceIds,
      selectedCompanionId: selectedCompanion?.id ?? null,
      personName
    });
  }, [
    step,
    recipientMode,
    duration,
    role,
    selectedServiceIds,
    selectedCompanion?.id,
    personName
  ]);

  const loadPatients = React.useCallback(async () => {
    setLoadingPatients(true);
    try {
      const response = await fetch(resolveApiUrl(PUBLIC_ROUTES.patients), {
        headers: authHeaders(token),
        cache: "no-store"
      });
      const payload = await response.json().catch(() => null);
      const list = listCompanions(payload);
      setCompanions(list);
      if (snapshot?.selectedCompanionId) {
        const match = list.find(
          item => Number(item.id) === Number(snapshot.selectedCompanionId)
        );
        if (match) setSelectedCompanion(match);
      }
    } catch {
      setCompanions([]);
    } finally {
      setLoadingPatients(false);
    }
  }, [token, snapshot?.selectedCompanionId]);

  const loadServices = React.useCallback(async () => {
    setLoadingServices(true);
    try {
      const response = await fetch(resolveApiUrl(PUBLIC_ROUTES.staffServices), {
        headers: authHeaders(token),
        cache: "no-store"
      });
      const payload = await response.json().catch(() => null);
      setServices(normalizeServicesPayload(payload));
    } catch {
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  }, [token]);

  const loadQuestions = React.useCallback(async () => {
    setLoadingQuestions(true);
    try {
      const url = new URL(resolveApiUrl(PANEL_ROUTES.question));
      if (id) url.searchParams.set("id", String(id));
      const response = await fetch(url.toString(), {
        headers: authHeaders(token),
        cache: "no-store"
      });
      const payload = await response.json().catch(() => null);
      const list = (normalizeQuestionsPayload(payload) as FormQuestion[]).slice();
      list.sort((a, b) => {
        const catA = categoryKeyOf(a);
        const catB = categoryKeyOf(b);
        if (catA == null && catB != null) return 1;
        if (catA != null && catB == null) return -1;
        if (catA != null && catB != null && catA !== catB) {
          const sortA = Number(a.category_sort_order) || 0;
          const sortB = Number(b.category_sort_order) || 0;
          if (sortA !== sortB) return sortA - sortB;
          return catA - catB;
        }
        return compareFormPageOrder(a, b);
      });
      setQuestions(list);
    } catch {
      setQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  }, [token, id]);

  React.useEffect(() => {
    void loadPatients();
    void loadServices();
  }, [loadPatients, loadServices]);

  React.useEffect(() => {
    if (
      step === "questions" ||
      step === "otherQuestions" ||
      step === "elderlyStatus" ||
      step === "elderlySummary"
    ) {
      void loadQuestions();
    }
  }, [step, loadQuestions]);

  const elderlyForUserId = React.useMemo(
    () =>
      resolveElderlyForUserId({
        recipientMode,
        companion: selectedCompanion,
        profile
      }),
    [recipientMode, selectedCompanion, profile]
  );

  const loadElderlyStatus = React.useCallback(async () => {
    const url = new URL(resolveApiUrl(PUBLIC_ROUTES.elderlyStatus));
    if (elderlyForUserId) {
      url.searchParams.set("for_user_id", String(elderlyForUserId));
    }
    try {
      const response = await fetch(url.toString(), {
        headers: authHeaders(token),
        cache: "no-store"
      });
      const payload = await response.json().catch(() => null);
      const rows = Array.isArray(payload?.result) ? payload.result : [];
      setElderlySaved(answersMapFromRows(rows));
      return answersMapFromRows(rows);
    } catch {
      setElderlySaved(new Map());
      return new Map<number, unknown>();
    }
  }, [elderlyForUserId, token]);

  React.useEffect(() => {
    setElderlySaved(new Map());
    setElderlyGateChecked(false);
    elderlyFilledThisSessionRef.current = false;
    returnToElderlySummaryRef.current = false;
  }, [recipientMode, selectedCompanion?.id, elderlyForUserId]);

  React.useEffect(() => {
    if (step !== "elderlyStatus") {
      setElderlyGateChecked(false);
      return;
    }
    let cancelled = false;
    setElderlyGateChecked(false);
    void (async () => {
      await loadQuestions();
      const saved = await loadElderlyStatus();
      if (cancelled) return;
      setElderlyGateChecked(true);
      void saved;
    })();
    return () => {
      cancelled = true;
    };
  }, [step, loadQuestions, loadElderlyStatus]);

  React.useEffect(() => {
    if (step !== "duration" && step !== "elderlySummary") return;
    let cancelled = false;
    void (async () => {
      if (!questions.length) await loadQuestions();
      if (cancelled) return;
      if (!elderlySaved.size) await loadElderlyStatus();
    })();
    return () => {
      cancelled = true;
    };
  }, [
    step,
    questions.length,
    elderlySaved.size,
    loadQuestions,
    loadElderlyStatus
  ]);

  React.useEffect(() => {
    if (!userSelectOpendialog) return;
    setRecipientMode("other");
    setStep("companion");
    void loadPatients();
    onUserSelectOpendialogChange?.(false);
  }, [userSelectOpendialog, loadPatients, onUserSelectOpendialogChange]);

  React.useEffect(() => {
    if (!questions.length) {
      setAnswersUser([]);
      return;
    }
    const person = resolveBookingPerson(
      recipientMode === "other" ? selectedCompanion : null,
      profile
    );
    setAnswersUser(
      questions.map(question => {
        const questionId = Number(question.id);
        const saved = elderlySaved.get(questionId);
        if (saved !== undefined && isAnswerFilled(saved)) {
          return { data: question, answers: saved };
        }
        return {
          data: question,
          answers: isAutofillableQuestion(question)
            ? autofillAnswerFor(question, person) ?? ""
            : ""
        };
      })
    );
  }, [questions, recipientMode, selectedCompanion, profile, elderlySaved]);

  const visibleServices = React.useMemo(
    () => filterStaffServicesForRequest(services, role, duration),
    [services, role, duration]
  );

  React.useEffect(() => {
    setSelectedServiceIds(prev => {
      const next = prev.filter(id =>
        visibleServices.some(service => String(service.id) === String(id))
      );
      return next.length === prev.length ? prev : next;
    });
  }, [visibleServices]);

  const selectedServices = React.useMemo(
    () =>
      visibleServices.filter(service =>
        selectedServiceIds.some(id => String(id) === String(service.id))
      ),
    [visibleServices, selectedServiceIds]
  );

  const visibleQuestionIndexes = React.useMemo(() => {
    const getAnswer = (questionId: number) =>
      getAnswerByQuestionId(questions, answersUser, questionId);
    return questions
      .map((question, index) => ({ question, index }))
      .filter(({ question }) =>
        isQuestionVisible(question, questions, getAnswer)
      );
  }, [questions, answersUser]);

  const elderlyQuestionIndexes = React.useMemo(
    () =>
      visibleQuestionIndexes.filter(({ question }) =>
        isElderlyStatusQuestion(question)
      ),
    [visibleQuestionIndexes]
  );

  const roleNeedsQuestionIndexes = React.useMemo(
    () =>
      visibleQuestionIndexes.filter(({ question }) =>
        isPrimaryRequestQuestion(question, role)
      ),
    [visibleQuestionIndexes, role]
  );

  const otherRequestQuestionIndexes = React.useMemo(
    () =>
      visibleQuestionIndexes.filter(({ question }) =>
        isOtherRequestQuestion(question, role)
      ),
    [visibleQuestionIndexes, role]
  );

  const requestQuestionIndexes = React.useMemo(
    () =>
      visibleQuestionIndexes.filter(({ question }) =>
        isInScopeRequestQuestion(question, role)
      ),
    [visibleQuestionIndexes, role]
  );

  const activeQuestionIndexes =
    step === "elderlyStatus"
      ? elderlyQuestionIndexes
      : step === "otherQuestions"
        ? otherRequestQuestionIndexes
        : roleNeedsQuestionIndexes;

  const formPageSteps = React.useMemo(() => {
    const visibleSet = new Set(activeQuestionIndexes.map(item => item.index));
    return buildFormPageSteps(questions, index => visibleSet.has(index));
  }, [questions, activeQuestionIndexes]);

  const currentFormPage = formPageSteps[questionStepIndex] || null;
  const currentPageIndexes = currentFormPage?.indexes || [];

  React.useEffect(() => {
    if (
      step !== "questions" &&
      step !== "otherQuestions" &&
      step !== "elderlyStatus"
    ) {
      return;
    }
    if (!formPageSteps.length) {
      setQuestionStepIndex(0);
      return;
    }
    if (questionStepIndex > formPageSteps.length - 1) {
      setQuestionStepIndex(formPageSteps.length - 1);
    }
  }, [step, formPageSteps, questionStepIndex]);

  /** Skip empty role-needs / other-questions phases. */
  React.useEffect(() => {
    if (loadingQuestions) return;
    if (step === "questions" && !roleNeedsQuestionIndexes.length) {
      if (otherRequestQuestionIndexes.length) {
        setQuestionStepIndex(0);
        setStep("otherQuestions");
      }
      return;
    }
    if (step === "otherQuestions" && !otherRequestQuestionIndexes.length) {
      setQuestionStepIndex(0);
      setStep("questions");
    }
  }, [
    step,
    loadingQuestions,
    roleNeedsQuestionIndexes.length,
    otherRequestQuestionIndexes.length
  ]);

  React.useEffect(() => {
    if (step !== "elderlyStatus" || !elderlyGateChecked || loadingQuestions) {
      return;
    }
    if (!filterElderlyStatusQuestions(questions).length) {
      setStep("duration");
      return;
    }
    if (!skipElderlyIfCompleteRef.current) return;
    const getAnswer = (questionId: number) =>
      getAnswerByQuestionId(questions, answersUser, questionId);
    if (isElderlyStatusComplete(questions, new Map(), getAnswer)) {
      setStep("duration");
    }
  }, [
    step,
    elderlyGateChecked,
    loadingQuestions,
    questions,
    answersUser
  ]);

  const addressLine = React.useMemo(() => {
    if (recipientMode === "other" && selectedCompanion) {
      return formatCompanionAddressLine(selectedCompanion);
    }
    if (!profile || typeof profile !== "object") return "";
    return formatCompanionAddressLine(
      profile as unknown as CompanionRecord
    );
  }, [recipientMode, selectedCompanion, profile]);

  const elderlySummaryRows = React.useMemo(
    () =>
      buildElderlySummaryRows(questions, elderlySaved, {
        addressLine
      }),
    [questions, elderlySaved, addressLine]
  );

  const shouldShowElderlySummary =
    !elderlyFilledThisSessionRef.current && elderlySummaryRows.length > 0;

  const requestAnswerPairs = React.useMemo(() => {
    const indexes = requestQuestionIndexes.map(item => item.index);
    return flattenAnswerPairs(questions, answersUser, indexes);
  }, [requestQuestionIndexes, questions, answersUser]);

  const summaryRows = React.useMemo(
    () =>
      buildRequestSummaryRows({
        personName,
        recipientMode,
        duration,
        role,
        selectedServices,
        answerPairs: requestAnswerPairs,
        addressFallback: addressLine
      }),
    [
      personName,
      recipientMode,
      duration,
      role,
      selectedServices,
      requestAnswerPairs,
      addressLine
    ]
  );

  React.useEffect(() => {
    if (step !== "summary" || !duration) {
      return;
    }
    const answers = pairsToAnswerMap(requestAnswerPairs);
    const ctx = {
      duration,
      role,
      serviceLabels: selectedServices.map(serviceLabel),
      answers,
      shiftHours: inferShiftHoursFromAnswers(answers)
    };
    const local = estimateNurseRequestPrice(
      ctx,
      PLATFORM_NURSE_PRICING_DEFAULTS,
      "platform"
    );
    if (local) {
      setPriceEstimate(local);
      setPriceDisplayRange(estimateDisplayRange(local));
    } else {
      setPriceEstimate(null);
      setPriceDisplayRange("");
    }

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/nurse-request/price-estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(ctx)
        });
        const payload = await response.json().catch(() => null);
        if (cancelled || !response.ok || !payload?.success || !payload.result) {
          return;
        }
        setPriceEstimate(payload.result as PriceEstimateResult);
        setPriceDisplayRange(
          String(payload.result.displayRange || estimateDisplayRange(payload.result))
        );
      } catch {
        /* keep local estimate */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, duration, role, selectedServices, requestAnswerPairs]);

  const canContinue = (() => {
    if (step === "recipient") return Boolean(recipientMode);
    if (step === "companion") {
      return recipientMode === "self" || Boolean(selectedCompanion);
    }
    if (step === "duration") return Boolean(duration);
    if (step === "elderlySummary") return elderlySummaryRows.length > 0;
    if (step === "role") return Boolean(role);
    if (step === "services") {
      return role === "unsure" || selectedServiceIds.length > 0;
    }
    return true;
  })();

  const progressInput = {
    step,
    recipientMode,
    selectedCompanionId: selectedCompanion?.id ?? null,
    duration,
    role,
    selectedServiceIds
  };
  const filledStageCount = nurseRequestFilledStageCount(progressInput);
  const stageNumber = nurseRequestCurrentStageLabel(step);
  const progressSegmentCount = step === "summary" ? 4 : 3;

  const validateCurrentPageAnswers = () => {
    for (const index of currentPageIndexes) {
      const question = questions[index];
      if (!question) continue;
      const answer = answersUser[index]?.answers;
      const required = isQuestionRequired(question);
      if (/کد\s*ملی/.test(String(question.question_text || ""))) {
        const nationalIdError = getNationalIdError(
          answer == null ? "" : String(answer),
          required
        );
        if (nationalIdError) return nationalIdError;
      }
      if (!required) continue;
      if (!isAnswerFilled(answer)) {
        return "لطفاً همه سوالات این صفحه را پاسخ دهید.";
      }
    }
    return "";
  };

  const saveElderlyStatusAnswers = async () => {
    const answers = buildElderlyStatusSavePayload(questions, answersUser);
    const response = await fetch(
      resolveApiUrl(PUBLIC_ROUTES.elderlyStatusUpdate),
      {
        method: "POST",
        headers: {
          ...authHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...(elderlyForUserId ? { for_user_id: elderlyForUserId } : {}),
          answers
        })
      }
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success === false) {
      throw new Error(payload?.message || "ذخیره وضعیت سالمند ناموفق بود.");
    }
    const next = new Map(elderlySaved);
    for (const row of answers) {
      next.set(row.question_id, parseElderlyAnswer(row.answer));
    }
    setElderlySaved(next);
  };

  const goHome = () => {
    clearWizardSnapshot();
    const pageBase = String(router.query.page || "home");
    void router.push(`/${pageBase}/`);
  };

  const goBack = () => {
    setError("");
    if (step === "supportCallbackSuccess" || step === "submitSuccess") {
      goHome();
      return;
    }
    if (step === "recipient") {
      void router.back();
      return;
    }
    if (step === "companion") setStep("recipient");
    else if (step === "elderlyStatus") {
      if (questionStepIndex > 0) {
        setQuestionStepIndex(questionStepIndex - 1);
        return;
      }
      if (returnToElderlySummaryRef.current) {
        returnToElderlySummaryRef.current = false;
        setStep("elderlySummary");
        return;
      }
      setStep(recipientMode === "other" ? "companion" : "recipient");
    } else if (step === "duration") {
      skipElderlyIfCompleteRef.current = false;
      setQuestionStepIndex(0);
      setStep("elderlyStatus");
    } else if (step === "elderlySummary") {
      setStep("duration");
    } else if (step === "role") {
      if (shouldShowElderlySummary) setStep("elderlySummary");
      else setStep("duration");
    } else if (step === "services") setStep("role");
    else if (step === "otherQuestions") {
      if (questionStepIndex > 0) {
        setQuestionStepIndex(questionStepIndex - 1);
        return;
      }
      setQuestionStepIndex(0);
      setStep("questions");
    } else if (step === "questions") {
      if (questionStepIndex > 0) {
        setQuestionStepIndex(questionStepIndex - 1);
        return;
      }
      setStep("services");
    } else if (step === "summary") {
      setQuestionStepIndex(0);
      if (otherRequestQuestionIndexes.length) {
        setStep("otherQuestions");
      } else {
        setStep("questions");
      }
    }
  };

  const goNext = () => {
    setError("");
    if (step === "recipient") {
      if (recipientMode === "self") {
        setSelectedCompanion(null);
        skipElderlyIfCompleteRef.current = true;
        elderlyFilledThisSessionRef.current = false;
        setQuestionStepIndex(0);
        setStep("elderlyStatus");
      } else {
        setStep("companion");
        void loadPatients();
      }
      return;
    }
    if (step === "companion") {
      if (!selectedCompanion && recipientMode !== "self") {
        setError("لطفاً یک همراه را انتخاب کنید.");
        return;
      }
      skipElderlyIfCompleteRef.current = true;
      elderlyFilledThisSessionRef.current = false;
      setQuestionStepIndex(0);
      setStep("elderlyStatus");
      return;
    }
    if (step === "elderlyStatus") {
      const pageError = validateCurrentPageAnswers();
      if (pageError) {
        setError(pageError);
        return;
      }
      if (questionStepIndex < formPageSteps.length - 1) {
        setQuestionStepIndex(questionStepIndex + 1);
        return;
      }
      void (async () => {
        setSavingElderlyStatus(true);
        try {
          await saveElderlyStatusAnswers();
          if (returnToElderlySummaryRef.current) {
            returnToElderlySummaryRef.current = false;
            setStep("elderlySummary");
          } else {
            elderlyFilledThisSessionRef.current = true;
            setStep("duration");
          }
        } catch (saveError) {
          setError(
            saveError instanceof Error
              ? saveError.message
              : "ذخیره وضعیت سالمند ناموفق بود."
          );
        } finally {
          setSavingElderlyStatus(false);
        }
      })();
      return;
    }
    if (step === "duration") {
      if (
        !elderlyFilledThisSessionRef.current &&
        elderlySummaryRows.length > 0
      ) {
        setStep("elderlySummary");
      } else {
        setStep("role");
      }
      return;
    }
    if (step === "elderlySummary") {
      setStep("role");
      return;
    }
    if (step === "role") {
      setSelectedServiceIds([]);
      setStep("services");
    } else if (step === "services") {
      setQuestionStepIndex(0);
      setStep("questions");
    } else if (step === "questions") {
      const pageError = validateCurrentPageAnswers();
      if (pageError) {
        setError(pageError);
        return;
      }
      if (questionStepIndex < formPageSteps.length - 1) {
        setQuestionStepIndex(questionStepIndex + 1);
        return;
      }
      if (otherRequestQuestionIndexes.length) {
        setQuestionStepIndex(0);
        setStep("otherQuestions");
      } else {
        setStep("summary");
      }
    } else if (step === "otherQuestions") {
      const pageError = validateCurrentPageAnswers();
      if (pageError) {
        setError(pageError);
        return;
      }
      if (questionStepIndex < formPageSteps.length - 1) {
        setQuestionStepIndex(questionStepIndex + 1);
        return;
      }
      setStep("summary");
    }
  };

  const openElderlyStatusEditor = () => {
    returnToElderlySummaryRef.current = true;
    skipElderlyIfCompleteRef.current = false;
    setQuestionStepIndex(0);
    setStep("elderlyStatus");
  };

  const openSummaryEdit = (editStep: RequestSummaryRow["editStep"]) => {
    setError("");
    if (editStep === "questions" || editStep === "otherQuestions") {
      setQuestionStepIndex(0);
    }
    setStep(editStep);
  };

  const toggleService = (serviceId: number | string) => {
    setSelectedServiceIds(prev =>
      prev.some(idValue => String(idValue) === String(serviceId))
        ? prev.filter(idValue => String(idValue) !== String(serviceId))
        : [...prev, serviceId]
    );
  };

  const validateAnswers = () => {
    for (const { question, index } of requestQuestionIndexes) {
      const answer = answersUser[index]?.answers;
      const required = isQuestionRequired(question);
      if (/کد\s*ملی/.test(String(question.question_text || ""))) {
        const nationalIdError = getNationalIdError(
          answer == null ? "" : String(answer),
          required
        );
        if (nationalIdError) return nationalIdError;
      }
      if (!required) continue;
      if (!isAnswerFilled(answer)) {
        return "لطفاً همه سوالات ضروری را پاسخ دهید.";
      }
    }
    return "";
  };

  const isLastQuestionPage =
    !formPageSteps.length || questionStepIndex >= formPageSteps.length - 1;

  const isFinalQuestionsStep =
    (step === "otherQuestions" && isLastQuestionPage) ||
    (step === "questions" &&
      isLastQuestionPage &&
      !otherRequestQuestionIndexes.length);

  const submit = async () => {
    const validationError = validateAnswers();
    if (validationError) {
      setError(validationError);
      toast("error", validationError);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const getAnswer = (questionId: number) =>
        getAnswerByQuestionId(questions, answersUser, questionId);
      const questionnaire = answersUser
        .filter(row => {
          const question = row.data || {};
          if (!isQuestionVisible(question, questions, getAnswer)) return false;
          if (isElderlyStatusQuestion(question)) return true;
          return isInScopeRequestQuestion(question, role);
        })
        .map(row => ({
          ...row.data,
          answer: row.answers
        }));
      questionnaire.unshift(
        {
          question_text: "گیرنده خدمت",
          type: "text",
          answer: personName
        } as FormQuestion & { answer: unknown },
        {
          question_text: "نوع درخواست",
          type: "text",
          answer: durationLabel(duration)
        } as FormQuestion & { answer: unknown },
        {
          question_text: "نوع نیرو",
          type: "text",
          answer: roleLabel(role)
        } as FormQuestion & { answer: unknown }
      );

      const response = await fetch(resolveApiUrl("/reservations/steff2"), {
        method: "POST",
        headers: {
          ...authHeaders(token),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          answers: JSON.stringify(questionnaire),
          ...buildCompanionBookingFields({
            companion:
              recipientMode === "other" ? selectedCompanion : null,
            forSelf: recipientMode !== "other"
          }),
          services_list: JSON.stringify(selectedServiceIds || [])
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "submit-failed");
      }
      clearWizardSnapshot();
      setSubmitSuccessCopy(buildSubmitSuccessCopy());
      toast("success", String(payload.message || "درخواست ثبت شد."));
      setStep("submitSuccess");
    } catch (submitError) {
      const message =
        submitError instanceof Error && submitError.message !== "submit-failed"
          ? submitError.message
          : "ثبت درخواست ممکن نشد. دوباره تلاش کنید.";
      setError(message);
      toast("error", message);
    } finally {
      setSubmitting(false);
    }
  };

  const headerTitle =
    step === "supportCallbackSuccess" || step === "submitSuccess"
      ? "ثبت شد"
      : step === "summary"
        ? "بررسی نهایی"
        : step === "elderlyStatus"
        ? "وضعیت سالمند"
        : step === "questions" || step === "otherQuestions"
          ? currentFormPage?.categoryTitle ||
            (step === "otherQuestions"
              ? "سوالات"
              : roleNeedsCategoryTitle(role))
          : "درخواست مراقب یا پرستار";

  const showSupport =
    step === "recipient" || step === "companion" || step === "duration";

  const showQuestionProgress =
    step === "services" ||
    step === "questions" ||
    step === "otherQuestions" ||
    step === "elderlyStatus" ||
    step === "summary";

  const hideFooter =
    step === "supportCallbackSuccess" || step === "submitSuccess";

  const goToMyRequests = () => {
    clearWizardSnapshot();
    void router.push("/booking/");
  };

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      dir="rtl"
    >
      <Header
        className={styles.header}
        slot={headerTitle}
        search={false}
        runCode
        back={goBack}
      />

      <div className={styles.body}>
        {showQuestionProgress && (
          <div className={styles.progressWrap}>
            <div
              className={
                progressSegmentCount === 4
                  ? `${styles.progressTrack} ${styles.progressTrackFour}`
                  : styles.progressTrack
              }
              aria-hidden
            >
              {Array.from({ length: progressSegmentCount }, (_, i) => i + 1).map(
                seg => (
                  <span
                    key={seg}
                    className={
                      seg <= filledStageCount
                        ? styles.progressSegOn
                        : styles.progressSeg
                    }
                  />
                )
              )}
            </div>
            <div className={styles.progressLabel}>
              {step === "summary" ? (
                <>
                  مرحله {faDigits(3)} از {faDigits(4)} • بررسی نهایی
                </>
              ) : step === "elderlyStatus" ? (
                <>وضعیت سالمند • تکمیل اطلاعات پایه</>
              ) : (step === "questions" || step === "otherQuestions") &&
                formPageSteps.length ? (
                <>
                  Page {faDigits(currentFormPage?.page || 1)} از{" "}
                  {faDigits(
                    formPageSteps.filter(
                      item =>
                        item.categoryId === currentFormPage?.categoryId
                    ).length || 1
                  )}{" "}
                  • {currentFormPage?.categoryTitle || "سوالات"}
                </>
              ) : (
                <>
                  مرحله {faDigits(stageNumber)} از {faDigits(3)} •{" "}
                  {stageNumber === 1
                    ? "انتخاب اولیه"
                    : stageNumber === 2
                      ? "انتخاب خدمت"
                      : "سوالات"}
                </>
              )}
            </div>
          </div>
        )}

        {showSupport ? (
          <div className={styles.supportBanner}>
            <div className={styles.supportCopy}>
              <SupportAgentIcon className={styles.agentIcon} />
              <span className={styles.heading}>
                فرم سخت است؟ پشتیبان فرم را برایتان پر کند
                <small>همین‌جا بزنید تا با شما تماس بگیریم</small>
              </span>
            </div>
            <button
              type="button"
              className={styles.supportBtn}
              onClick={() => setSupportCallbackOpen(true)}
            >
              پشتیبانی
            </button>
          </div>
        ) : null}

        <SupportCallbackDialog
          open={supportCallbackOpen}
          onOpenChange={setSupportCallbackOpen}
          profile={profile}
          token={token}
          source="nurse_request"
          onSuccess={() => {
            setSupportCallbackOpen(false);
            setError("");
            setStep("supportCallbackSuccess");
          }}
          onError={message => toast("error", message)}
        />

        {step === "supportCallbackSuccess" ? (
          <div className={styles.callbackSuccess}>
            <div className={styles.callbackSuccessIcon} aria-hidden>
              <CircleCheckIcon className={styles.callbackSuccessGlyph} />
            </div>
            <h2 className={styles.callbackSuccessTitle}>
              درخواست تماس ثبت شد
            </h2>
            <p className={styles.callbackSuccessText}>
              پشتیبان سایبان تا ۳۰ دقیقه دیگر با شماره‌ای که دادید تماس
              می‌گیرد.
            </p>
            <div className={styles.callbackSuccessCard}>
              <span className={styles.callbackSuccessPhone} aria-hidden>
                <PhoneIcon className={styles.callbackSuccessPhoneGlyph} />
              </span>
              <span>
                از خط ۰۹۱۰… تماس می‌گیریم. اگر جواب ندادید، دوباره تلاش
                می‌کنیم.
              </span>
            </div>
            <button
              type="button"
              className={styles.callbackSuccessHome}
              onClick={goHome}
            >
              بازگشت به خانه
            </button>
          </div>
        ) : null}

        {step === "submitSuccess" ? (
          <div className={styles.callbackSuccess}>
            <div className={styles.callbackSuccessIcon} aria-hidden>
              <CircleCheckIcon className={styles.callbackSuccessGlyph} />
            </div>
            <h2 className={styles.callbackSuccessTitle}>
              {submitSuccessCopy.title}
            </h2>
            <p className={styles.callbackSuccessText}>
              {submitSuccessCopy.subtitle}
            </p>
            <div className={styles.callbackSuccessCard}>
              <span>{submitSuccessCopy.detail}</span>
            </div>
            <button
              type="button"
              className={styles.primary}
              onClick={goToMyRequests}
            >
              دیدن در درخواست‌های من
            </button>
          </div>
        ) : null}

        {step === "recipient" ? (
          <>
            <h2 className={styles.heading}>مراقبت برای چه کسی است؟</h2>
            <p className={styles.subheading}>
              اطلاعات را یک بار می‌گیریم و برای دفعات بعد ذخیره می‌کنیم.
            </p>
            <div className={styles.optionList}>
              <OptionCard
                selected={recipientMode === "self"}
                title="برای خودم می‌خواهم"
                description="من خودم به مراقب یا پرستار نیاز دارم"
                icon={<UserIcon className={styles.optionGlyph} />}
                onClick={() => {
                  setRecipientMode("self");
                  setSelectedCompanion(null);
                }}
              />
              <OptionCard
                selected={recipientMode === "other"}
                title="برای یک سالمند دیگر"
                description="پدر، مادر، همسر یا هر کسی که می‌خواهید"
                icon={<UserHeartIcon className={styles.optionGlyph} />}
                onClick={() => setRecipientMode("other")}
              />
            </div>
          </>
        ) : null}

        {step === "companion" ? (
          <>
            <h2 className={styles.heading}>مراقبت برای چه کسی است؟</h2>
            <p className={styles.subheading}>
              یکی از همراهان ذخیره‌شده را انتخاب کنید یا همراه جدید اضافه کنید.
            </p>
            {loadingPatients ? (
              <div className={styles.loading} aria-label="در حال دریافت همراهان">
                {[1, 2].map(item => (
                  <div key={item} className={`${styles.skeleton} shimmer`} />
                ))}
              </div>
            ) : (
              <div className={styles.optionList}>
                {companions.map(item => {
                  const age = companionAgeLabel(
                    item as unknown as Record<string, unknown>
                  );
                  return (
                    <OptionCard
                      key={item.id}
                      selected={Number(selectedCompanion?.id) === Number(item.id)}
                      title={companionDisplayName(item)}
                      description={age || undefined}
                      icon={<UserIcon className={styles.optionGlyph} />}
                      onClick={() => {
                        setSelectedCompanion(item);
                        setRecipientMode("other");
                      }}
                    />
                  );
                })}
                <OptionCard
                  selected={
                    recipientMode === "self" && !selectedCompanion
                  }
                  title="برای خودم"
                  description={selfName}
                  icon={<UserIcon className={styles.optionGlyph} />}
                  onClick={() => {
                    setRecipientMode("self");
                    setSelectedCompanion(null);
                  }}
                />
                {!companions.length ? (
                  <div className={styles.empty}>
                    هنوز همراهی ثبت نکرده‌اید. با دکمه زیر یک همراه اضافه کنید.
                  </div>
                ) : null}
                <button
                  type="button"
                  className={styles.addCard}
                  onClick={() => userNew?.()}
                >
                  + افزودن همراه
                </button>
              </div>
            )}
          </>
        ) : null}

        {step === "duration" ? (
          <>
            <h2 className={styles.heading}>این خدمت یک بار است یا مداوم؟</h2>
            <p className={styles.subheading}>
              یک بار: برای یک کار یا چند ساعت مشخص. مداوم: مراقب یا پرستار ثابت
              که هر روز می‌آید یا در منزل می‌ماند.
            </p>
            <div className={styles.personChip}>
              <div className={styles.personChipMain}>
                <span aria-hidden>
                  <UserIcon className={styles.chipGlyph} />
                </span>
                <span>
                  {personName}
                  {recipientMode === "other" && selectedCompanion
                    ? ` ${companionAgeLabel(
                      selectedCompanion as unknown as Record<string, unknown>
                    )}`
                    : ""}
                </span>
              </div>
              <button
                type="button"
                className={styles.changeBtn}
                onClick={() =>
                  setStep(recipientMode === "other" ? "companion" : "recipient")
                }
              >
                تغییر
              </button>
            </div>
            <div className={styles.optionList}>
              <OptionCard
                selected={duration === "once"}
                title="یک بار"
                description="مثل حمام، تزریق، پانسمان یا همراهی در بیمارستان"
                icon={<ClockIcon className={styles.optionGlyph} />}
                onClick={() => setDuration("once")}
              />
              <OptionCard
                selected={duration === "continuous"}
                title="مداوم"
                description="روزانه یا شبانه‌روزی در منزل"
                icon={<HeartIcon className={styles.optionGlyph} />}
                onClick={() => setDuration("continuous")}
              />
            </div>
            {duration === "continuous" ? (
              <div className={styles.notice}>
                <span aria-hidden>
                  <InfoCircleIcon className={styles.noticeGlyph} />
                </span>
                <span>
                  در خدمت مداوم، قبل از شروع مصاحبه می‌کنید و دو روز آزمایشی
                  دارید.
                </span>
              </div>
            ) : null}
          </>
        ) : null}

        {step === "elderlySummary" ? (
          <>
            <h2 className={styles.heading}>هنوز همین‌طور است؟</h2>
            <p className={styles.subheading}>
              اطلاعات دفعهٔ قبل {personName} را آورده‌ایم.
            </p>
            <div className={styles.summaryCard}>
              {elderlySummaryRows.map((row, index) => (
                <div
                  key={row.key}
                  className={
                    index < elderlySummaryRows.length - 1
                      ? styles.summaryRow
                      : styles.summaryRowLast
                  }
                >
                  <div className={styles.summaryCopy}>
                    <span className={styles.summaryLabel}>{row.label}</span>
                    <span className={styles.summaryValue}>{row.value}</span>
                  </div>
                  <button
                    type="button"
                    className={styles.summaryEdit}
                    onClick={openElderlyStatusEditor}
                  >
                    ویرایش
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {step === "role" ? (
          <>
            <h2 className={styles.heading}>کدام را لازم دارید؟</h2>
            <p className={styles.subheading}>
              انتخاب درست، قیمت و پیشنهادها را دقیق‌تر می‌کند.
            </p>
            <div className={styles.personChip}>
              <div className={styles.personChipMain}>
                <span aria-hidden>
                  <UserIcon className={styles.chipGlyph} />
                </span>
                <span>
                  {personName}
                  {selectedCompanion
                    ? ` - ${companionAgeLabel(
                      selectedCompanion as unknown as Record<string, unknown>
                    )}`
                    : ""}
                </span>
              </div>
              <button
                type="button"
                className={styles.changeBtn}
                onClick={() =>
                  setStep(
                    shouldShowElderlySummary ? "elderlySummary" : "duration"
                  )
                }
              >
                تغییر
              </button>
            </div>
            <div className={styles.optionList}>
              <OptionCard
                selected={role === "caregiver"}
                title="مراقب"
                description="همراهی و کمک در کارهای روزمره: غذا، حمام، دارو، رفت‌وآمد"
                icon={<UserHeartIcon className={styles.optionGlyph} />}
                onClick={() => setRole("caregiver")}
              />
              <OptionCard
                selected={role === "nurse"}
                title="پرستار"
                description="کارهای پرستاری: تزریق، سرم، پانسمان، مراقبت از زخم، کنترل علائم حیاتی"
                icon={<MedicalCrossIcon className={styles.optionGlyph} />}
                onClick={() => setRole("nurse")}
              />
              <OptionCard
                selected={role === "unsure"}
                title="مطمئن نیستم"
                description="پشتیبان راهنمایی می‌کند"
                icon={<HeadphonesIcon className={styles.optionGlyph} />}
                onClick={() => setRole("unsure")}
              />
            </div>
            {role === "nurse" ? (
              <div className={styles.notice}>
                <span aria-hidden>
                  <InfoCircleIcon className={styles.noticeGlyph} />
                </span>
                <span>
                  اگر هم کمک روزمره و هم کار پرستاری لازم است، پرستار را انتخاب
                  کنید و کمک روزمره را در توضیحات بنویسید.
                </span>
              </div>
            ) : null}
            {role === "unsure" ? (
              <div className={styles.noticeWarn}>
                <span aria-hidden>
                  <InfoCircleIcon className={styles.noticeGlyph} />
                </span>
                <span>
                  می‌توانید ادامه دهید؛ در مرحله بعد همه خدمات را می‌بینید یا با
                  پشتیبان تماس بگیرید.
                </span>
              </div>
            ) : null}
          </>
        ) : null}

        {step === "services" ? (
          <>
            <div className={styles.summaryCard}>
              <span aria-hidden>
                <UserIcon className={styles.chipGlyph} />
              </span>
              <span>
                {summaryLine({
                  personName,
                  duration,
                  role
                })}
              </span>
            </div>
            <h2 className={styles.heading}>
              {role === "nurse"
                ? "پرستار چه کارهایی انجام دهد؟"
                : "کدام خدمات لازم است؟"}
            </h2>
            <p className={styles.subheading}>می‌توانید چند مورد را انتخاب کنید</p>
            {loadingServices ? (
              <div className={styles.loading}>
                {[1, 2, 3].map(item => (
                  <div key={item} className={`${styles.skeleton} shimmer`} />
                ))}
              </div>
            ) : visibleServices.length ? (
              <div className={styles.optionList}>
                {visibleServices.map(service => {
                  const selected = selectedServiceIds.some(
                    idValue => String(idValue) === String(service.id)
                  );
                  return (
                    <OptionCard
                      key={String(service.id)}
                      selected={selected}
                      title={serviceLabel(service)}
                      description={
                        service.description
                          ? String(service.description)
                          : undefined
                      }
                      multi
                      onClick={() => toggleService(service.id)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className={styles.empty}>
                خدمتی برای این انتخاب یافت نشد. می‌توانید با پشتیبان تماس بگیرید
                یا نقش دیگری انتخاب کنید.
              </div>
            )}
            {role === "nurse" ? (
              <div className={styles.noticeWarn}>
                <span aria-hidden>
                  <InfoCircleIcon className={styles.noticeGlyph} />
                </span>
                <span>
                  پرستار کار خانه (نظافت و آشپزی) انجام نمی‌دهد. اگر کمک روزمره
                  هم لازم است، در مرحله توضیحات بنویسید.
                </span>
              </div>
            ) : null}
          </>
        ) : null}

        {step === "elderlyStatus" ||
        step === "questions" ||
        step === "otherQuestions" ? (
          <>
            {step === "questions" || step === "otherQuestions" ? (
              <div className={styles.summaryCard}>
                <span aria-hidden>
                  <UserIcon className={styles.chipGlyph} />
                </span>
                <span>
                  {summaryLine({
                    personName,
                    duration,
                    role
                  })}
                </span>
              </div>
            ) : (
              <div className={styles.summaryCard}>
                <span aria-hidden>
                  <UserIcon className={styles.chipGlyph} />
                </span>
                <span>{personName}</span>
              </div>
            )}
            {loadingQuestions || (step === "elderlyStatus" && !elderlyGateChecked) ? (
              <div className={styles.loading}>
                {[1, 2, 3, 4].map(item => (
                  <div key={item} className={`${styles.skeleton} shimmer`} />
                ))}
              </div>
            ) : currentPageIndexes.length ? (
              <div className={styles.questionBlock}>
                <div className={styles.categoryTitle}>
                  {currentFormPage?.categoryTitle ||
                    (step === "elderlyStatus"
                      ? "وضعیت سالمند"
                      : roleNeedsCategoryTitle(role))}
                  <span className={styles.pageBadge}>
                    Page {faDigits(currentFormPage?.page || 1)}
                  </span>
                </div>
                {currentPageIndexes.map(index => {
                  const question = questions[index];
                  if (!question) return null;
                  return (
                    <AnswersUser
                      key={String(question.id ?? index)}
                      currentItem={question}
                      answers={answersUser[index]?.answers}
                      onAnswersChange={value => {
                        setAnswersUser(prev => {
                          const next = [...prev];
                          next[index] = {
                            data: question,
                            answers: value
                          };
                          return next;
                        });
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              <div className={styles.empty}>
                {step === "elderlyStatus"
                  ? "سوالی برای وضعیت سالمند نیست."
                  : "سوالی برای نمایش نیست. می‌توانید درخواست را ثبت کنید."}
              </div>
            )}
          </>
        ) : null}

        {step === "summary" ? (
          <>
            <h2 className={styles.heading}>خلاصه درخواست</h2>
            <div className={styles.summaryCard}>
              {summaryRows.map((row, index) => (
                <div
                  key={row.key}
                  className={
                    index < summaryRows.length - 1
                      ? styles.summaryRow
                      : styles.summaryRowLast
                  }
                >
                  <div className={styles.summaryCopy}>
                    <span className={styles.summaryLabel}>{row.label}</span>
                    <span className={styles.summaryValue}>{row.value}</span>
                  </div>
                  <button
                    type="button"
                    className={styles.summaryEdit}
                    onClick={() => openSummaryEdit(row.editStep)}
                  >
                    ویرایش
                  </button>
                </div>
              ))}
            </div>
            {priceEstimate && priceDisplayRange ? (
              <div className={styles.priceBox}>
                <span className={styles.priceBoxHeading}>
                  {priceEstimate.heading}
                </span>
                <span className={styles.priceBoxValue}>{priceDisplayRange}</span>
                <span className={styles.priceBoxNote}>{priceEstimate.note}</span>
              </div>
            ) : null}
            <p className={styles.summaryFootnote}>
              تا وقتی مراقب را انتخاب نکنید پولی پرداخت نمی‌شود.
            </p>
          </>
        ) : null}

        {error ? (
          <div className={styles.error} role="alert">
            {error}
          </div>
        ) : null}
      </div>

      {!hideFooter ? (
      <div className={styles.footer}>
        {step === "summary" ? (
          <button
            type="button"
            className={styles.primary}
            disabled={submitting}
            onClick={() => void submit()}
          >
            {submitting ? "در حال ثبت…" : "تأیید نهایی"}
          </button>
        ) : step === "questions" || step === "otherQuestions"
          ? isFinalQuestionsStep
            ? (
          <button
            type="button"
            className={styles.primary}
            disabled={submitting}
            onClick={() => {
              const pageError = validateCurrentPageAnswers();
              if (pageError) {
                setError(pageError);
                return;
              }
              setStep("summary");
            }}
          >
            ادامه
          </button>
            )
            : (
          <button
            type="button"
            className={styles.primary}
            disabled={!canContinue || submitting}
            onClick={goNext}
          >
            ادامه
          </button>
            )
        : step === "elderlySummary" ? (
          <button
            type="button"
            className={styles.primary}
            disabled={!canContinue || submitting}
            onClick={goNext}
          >
            بله، همین‌طور است
            <span className={styles.primaryCheck} aria-hidden>
              <CheckIcon className={styles.primaryCheckGlyph} />
            </span>
          </button>
        ) : (
          <button
            type="button"
            className={styles.primary}
            disabled={!canContinue || submitting || savingElderlyStatus}
            onClick={goNext}
          >
            {savingElderlyStatus ? "در حال ذخیره…" : "ادامه"}
          </button>
        )}
      </div>
      ) : null}
    </div>
  );
}
