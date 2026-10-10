export type RecipientMode = "self" | "other" | null;
export type DurationMode = "once" | "continuous" | null;
export type RoleMode = "caregiver" | "nurse" | "unsure" | null;

export type WizardStep =
  | "recipient"
  | "companion"
  | "elderlyStatus"
  | "duration"
  | "elderlySummary"
  | "role"
  | "services"
  | "questions"
  | "otherQuestions"
  | "summary"
  | "submitSuccess"
  | "supportCallbackSuccess";

export type StaffService = {
  id: number | string;
  name?: string;
  title?: string;
  category?: string;
  description?: string;
  /** once | continuous; absent/null = legacy (shown for any duration). */
  duration_mode?: "once" | "continuous" | string | null;
  [key: string]: unknown;
};

export const ROLE_TO_CATEGORY: Record<
  Exclude<RoleMode, null | "unsure">,
  "general" | "specialized"
> = {
  caregiver: "general",
  nurse: "specialized"
};

export const WIZARD_STORAGE_KEY = "sayban.nurseRequest.wizard";

export type WizardSnapshot = {
  step: WizardStep;
  recipientMode: RecipientMode;
  duration: DurationMode;
  role: RoleMode;
  selectedServiceIds: Array<number | string>;
  selectedCompanionId?: number | null;
  /** Display name for cross-screen chrome (e.g. AddAddress summary chip). */
  personName?: string;
};

export function faDigits(value: string | number) {
  return String(value).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

export function serviceLabel(service: StaffService) {
  return String(service.name || service.title || "خدمت").trim();
}

export function filterServicesByRole(
  services: StaffService[],
  role: RoleMode
): StaffService[] {
  if (!role || role === "unsure") return services;
  const category = ROLE_TO_CATEGORY[role];
  return services.filter(
    item => !item.category || String(item.category) === category
  );
}

/** Role then duration (legacy services without duration_mode stay visible). */
export function filterStaffServicesForRequest(
  services: StaffService[],
  role: RoleMode,
  duration: DurationMode
): StaffService[] {
  const byRole = filterServicesByRole(services, role);
  // Lazy import avoided: keep filter logic inline to match staffServiceDuration.
  if (!duration) return byRole;
  return byRole.filter(item => {
    const raw = item.duration_mode ?? item.durationMode;
    if (raw == null || raw === "") return true;
    const mode = String(raw).trim().toLowerCase();
    if (mode === "once" || mode === "one" || mode === "one_time") {
      return duration === "once";
    }
    if (mode === "continuous" || mode === "ongoing") {
      return duration === "continuous";
    }
    if (mode === "یکبار" || mode === "یک‌بار") return duration === "once";
    if (mode === "مداوم" || mode === "مستمر") return duration === "continuous";
    return true;
  });
}

export function companionDisplayName(person: {
  name?: string | null;
  relation_persian?: string | null;
  relation?: string | null;
}) {
  const name = String(person.name || "").trim();
  const relation = String(
    person.relation_persian || person.relation || ""
  ).trim();
  if (relation && name && !name.includes(relation)) {
    return `${relation} ${name}`;
  }
  return name || relation || "همراه";
}

export function companionAgeLabel(person?: Record<string, unknown> | null) {
  if (!person) return "";
  const direct = Number(person.age);
  if (Number.isFinite(direct) && direct > 0) {
    return `${faDigits(Math.floor(direct))} ساله`;
  }
  const raw = String(person.birth_date || person.birthday || "").trim();
  if (!raw) return "";
  const birth = new Date(raw);
  if (Number.isNaN(birth.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  if (age < 0 || age > 130) return "";
  return `${faDigits(age)} ساله`;
}

export function roleLabel(role: RoleMode) {
  if (role === "caregiver") return "مراقب";
  if (role === "nurse") return "پرستار";
  if (role === "unsure") return "نامشخص";
  return "";
}

export function durationLabel(duration: DurationMode) {
  if (duration === "once") return "یک‌بار";
  if (duration === "continuous") return "مداوم";
  return "";
}

export function summaryLine(input: {
  personName: string;
  duration: DurationMode;
  role: RoleMode;
}) {
  const role = roleLabel(input.role);
  const duration = durationLabel(input.duration);
  const serviceBit = [role, duration].filter(Boolean).join(" ");
  return [input.personName, serviceBit].filter(Boolean).join(" • ");
}

export function readWizardSnapshot(): WizardSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WizardSnapshot;
  } catch {
    return null;
  }
}

export function writeWizardSnapshot(snapshot: WizardSnapshot) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore */
  }
}

export function clearWizardSnapshot() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(WIZARD_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function normalizeServicesPayload(payload: unknown): StaffService[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const result = root.result;
  if (Array.isArray(result)) return result as StaffService[];
  if (result && typeof result === "object") {
    const services = (result as { services?: unknown }).services;
    if (Array.isArray(services)) return services as StaffService[];
  }
  if (Array.isArray(root.services)) return root.services as StaffService[];
  return [];
}

export function normalizeQuestionsPayload(payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object") return [];
  const result = (payload as { result?: unknown }).result;
  return Array.isArray(result) ? result : [];
}

/** Inputs for top-of-page progress; filled only from real answers. */
export type NurseRequestProgressInput = {
  step: WizardStep;
  recipientMode: RecipientMode;
  selectedCompanionId?: number | null;
  duration: DurationMode;
  role: RoleMode;
  selectedServiceIds: Array<number | string>;
};

/** Stage 1: recipient (+ companion if other) + duration + role. */
export function isNurseRequestStage1Complete(
  input: NurseRequestProgressInput
): boolean {
  if (!input.recipientMode || !input.duration || !input.role) return false;
  if (input.recipientMode === "other") {
    const id = Number(input.selectedCompanionId);
    if (!Number.isInteger(id) || id <= 0) return false;
  }
  return true;
}

/** Stage 2: services chosen (or unsure role skips service pick). */
export function isNurseRequestStage2Complete(
  input: NurseRequestProgressInput
): boolean {
  if (!isNurseRequestStage1Complete(input)) return false;
  if (input.role === "unsure") return true;
  return input.selectedServiceIds.length > 0;
}

/** Stage 3: user reached summary with prior stages done. */
export function isNurseRequestStage3Complete(
  input: NurseRequestProgressInput
): boolean {
  if (!isNurseRequestStage2Complete(input)) return false;
  return input.step === "summary" || input.step === "submitSuccess";
}

/** How many progress segments are filled (completed milestones only). */
export function nurseRequestFilledStageCount(
  input: NurseRequestProgressInput
): number {
  if (isNurseRequestStage3Complete(input)) return 3;
  if (isNurseRequestStage2Complete(input)) return 2;
  if (isNurseRequestStage1Complete(input)) return 1;
  return 0;
}

/**
 * Label "current stage" from wizard location (not fill state).
 * elderlyStatus stays in stage 1 — it is not the questions phase.
 */
export function nurseRequestCurrentStageLabel(step: WizardStep): number {
  if (
    step === "summary" ||
    step === "submitSuccess" ||
    step === "questions" ||
    step === "otherQuestions"
  ) {
    return 3;
  }
  if (step === "services") return 2;
  return 1;
}
