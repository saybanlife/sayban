import {
  companionDisplayName,
  durationLabel,
  roleLabel,
  type DurationMode,
  type RoleMode,
  type StaffService,
  serviceLabel
} from "./nurseRequestModel";

export type RequestSummaryRow = {
  key: string;
  label: string;
  value: string;
  /** Wizard step to jump to when user taps ویرایش */
  editStep:
    | "recipient"
    | "companion"
    | "duration"
    | "role"
    | "services"
    | "questions"
    | "otherQuestions";
};

function answerText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return value
      .map(item => answerText(item))
      .filter(Boolean)
      .join("، ");
  }
  if (typeof value === "object") {
    const row = value as Record<string, unknown>;
    if (row.label != null) return String(row.label).trim();
    if (row.name != null) return String(row.name).trim();
    if (row.title != null) return String(row.title).trim();
    if (row.text != null) return String(row.text).trim();
    if (row.value != null) return answerText(row.value);
  }
  return "";
}

function pickAnswer(
  answersByLabel: Array<{ label: string; value: string }>,
  patterns: RegExp[]
): string {
  for (const pattern of patterns) {
    const hit = answersByLabel.find(item => pattern.test(item.label));
    if (hit?.value) return hit.value;
  }
  return "";
}

export function buildRequestSummaryRows(input: {
  personName: string;
  recipientMode: "self" | "other" | null;
  duration: DurationMode;
  role: RoleMode;
  selectedServices: StaffService[];
  answerPairs: Array<{ label: string; value: unknown }>;
  addressFallback?: string;
}): RequestSummaryRow[] {
  const pairs = input.answerPairs
    .map(item => ({
      label: String(item.label || "").trim(),
      value: answerText(item.value)
    }))
    .filter(item => item.label && item.value);

  const serviceNames = input.selectedServices.map(serviceLabel).filter(Boolean);
  const hours = pickAnswer(pairs, [/ساعت/, /شیفت/, /مدت/]);
  const tasks = pickAnswer(pairs, [/کار/, /خدمت/, /نیاز/, /وظیفه/]);
  const start = pickAnswer(pairs, [/شروع/, /تاریخ/, /روز/]);
  const time = pickAnswer(pairs, [/^زمان$/, /وقت/, /ساعت شروع/]);
  const place = pickAnswer(pairs, [/مکان/, /بیمارستان/, /محل/]);
  const address =
    pickAnswer(pairs, [/آدرس/]) || String(input.addressFallback || "").trim();
  const preference = pickAnswer(pairs, [/ترجیح/, /جنسیت/, /خانم|آقا/]);

  const rows: RequestSummaryRow[] = [];

  rows.push({
    key: "for",
    label: "برای",
    value: input.personName || "—",
    editStep: input.recipientMode === "other" ? "companion" : "recipient"
  });

  if (input.duration === "once") {
    const serviceBits = [
      serviceNames.join("، ") || roleLabel(input.role),
      hours
    ]
      .filter(Boolean)
      .join("، ");
    rows.push({
      key: "service",
      label: "خدمت",
      value: serviceBits || durationLabel(input.duration) || "—",
      editStep: serviceNames.length ? "services" : "role"
    });
    const when = [start, time].filter(Boolean).join("، ");
    if (when) {
      rows.push({
        key: "when",
        label: "زمان",
        value: when,
        editStep: "questions"
      });
    }
    if (place || address) {
      rows.push({
        key: "place",
        label: "مکان",
        value: place || address,
        editStep: place ? "questions" : "otherQuestions"
      });
    }
  } else {
    const typeBits = [
      roleLabel(input.role),
      durationLabel(input.duration)
    ]
      .filter(Boolean)
      .join(" ");
    rows.push({
      key: "type",
      label: "نوع",
      value: typeBits || "—",
      editStep: "role"
    });
    if (hours) {
      rows.push({
        key: "hours",
        label: "ساعت کار",
        value: hours,
        editStep: "questions"
      });
    }
    const taskValue = tasks || serviceNames.join("، ");
    if (taskValue) {
      rows.push({
        key: "tasks",
        label: input.role === "nurse" ? "کارهای پرستاری" : "کارها",
        value: taskValue,
        editStep: serviceNames.length ? "services" : "questions"
      });
    }
    if (start) {
      rows.push({
        key: "start",
        label: "شروع",
        value: start,
        editStep: "questions"
      });
    }
    if (address) {
      rows.push({
        key: "address",
        label: "آدرس",
        value: address,
        editStep: "otherQuestions"
      });
    }
    if (preference) {
      rows.push({
        key: "preference",
        label: "ترجیح",
        value: preference,
        editStep: "otherQuestions"
      });
    }
  }

  return rows.filter(row => row.value && row.value !== "—");
}

export function flattenAnswerPairs(
  questions: Array<{ question_text?: unknown }>,
  answers: Array<{ answers?: unknown }>,
  indexes: number[]
): Array<{ label: string; value: unknown }> {
  const pairs: Array<{ label: string; value: string }> = [];
  for (const index of indexes) {
    const question = questions[index];
    const label = String(question?.question_text || "").trim();
    const value = answers[index]?.answers;
    if (!label) continue;
    pairs.push({ label, value: answerText(value) });
  }
  return pairs;
}

export function pairsToAnswerMap(
  pairs: Array<{ label: string; value: unknown }>
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const pair of pairs) {
    const label = String(pair.label || "").trim();
    const value = answerText(pair.value);
    if (!label || !value) continue;
    map[label] = value;
  }
  return map;
}

export function inferShiftHoursFromAnswers(
  answers: Record<string, string>
): number | null {
  const hay = Object.values(answers).join(" ");
  const match = hay.match(/(\d{1,2})\s*ساعت/) || hay.match(/(\d{1,2})\s*h\b/i);
  if (!match) return null;
  const hours = Number(match[1]);
  return Number.isFinite(hours) && hours > 0 ? hours : null;
}

export function buildSubmitSuccessCopy(now = new Date()) {
  const hour = now.getHours();
  const minute = now.getMinutes();
  const timeLabel = `${faDigitsPad(hour)}:${faDigitsPad(minute)}`;
  const inBusinessHours = hour >= 9 && hour < 18;

  if (inBusinessHours) {
    const etaHour = Math.min(hour + 2, 20);
    return {
      title: "درخواست شما ثبت شد",
      subtitle: "نیروها پیشنهاد می‌دهند و هر پیشنهاد را در برنامه می‌بینید.",
      detail: `درخواست ساعت ${timeLabel} ثبت شد. تا حدود ساعت ${faDigitsPad(etaHour)} پیشنهادها می‌رسند. پیامک فقط در پایان این مهلت می‌آید.`
    };
  }

  return {
    title: "درخواست شما ثبت شد",
    subtitle: "چون خارج از ساعت کاری است، پیشنهادها فردا می‌رسند.",
    detail: `درخواست ساعت ${timeLabel} ثبت شد. تا ساعت ۱۰ صبح روز کاری بعد، پیشنهادها می‌رسند. پیامک فقط در پایان این مهلت می‌آید.`
  };
}

function faDigitsPad(value: number) {
  return String(value)
    .padStart(2, "0")
    .replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

export { companionDisplayName };
