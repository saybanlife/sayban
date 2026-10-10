/**
 * Role-linked question categories for nurse/caregiver request wizard.
 */

import type { FormQuestion } from "./questionCategories";
import { isElderlyStatusQuestion } from "./elderlyStatusModel";

export const CARE_NEEDS_CATEGORY_TITLE = "نیازهای مراقبت";
export const NURSING_NEEDS_CATEGORY_TITLE = "نیازهای پرستاری";

/** Fallback when title is missing but category id matches DB seed. */
export const CARE_NEEDS_CATEGORY_ID = 4;
export const NURSING_NEEDS_CATEGORY_ID = 5;

export type RoleNeedsMode = "caregiver" | "nurse" | "unsure" | null;

export function isCareNeedsQuestion(question: {
  category_title?: unknown;
  category_id?: unknown;
}): boolean {
  const title = String(question.category_title || "").trim();
  if (title === CARE_NEEDS_CATEGORY_TITLE) return true;
  return Number(question.category_id) === CARE_NEEDS_CATEGORY_ID && !title;
}

export function isNursingNeedsQuestion(question: {
  category_title?: unknown;
  category_id?: unknown;
}): boolean {
  const title = String(question.category_title || "").trim();
  if (title === NURSING_NEEDS_CATEGORY_TITLE) return true;
  return Number(question.category_id) === NURSING_NEEDS_CATEGORY_ID && !title;
}

export function roleNeedsCategoryTitle(role: RoleNeedsMode): string {
  if (role === "nurse") return NURSING_NEEDS_CATEGORY_TITLE;
  return CARE_NEEDS_CATEGORY_TITLE;
}

export function isRoleNeedsQuestion(
  question: {
    category_title?: unknown;
    category_id?: unknown;
  },
  role: RoleNeedsMode
): boolean {
  if (role === "nurse") return isNursingNeedsQuestion(question);
  if (role === "caregiver") return isCareNeedsQuestion(question);
  return false;
}

export function isOppositeRoleNeedsQuestion(
  question: {
    category_title?: unknown;
    category_id?: unknown;
  },
  role: RoleNeedsMode
): boolean {
  if (role === "nurse") return isCareNeedsQuestion(question);
  if (role === "caregiver") return isNursingNeedsQuestion(question);
  return false;
}

/**
 * First question phase after service pick: only the matching role category.
 * For unsure/null, includes both care and nursing needs (all role-linked).
 */
export function isPrimaryRequestQuestion(
  question: FormQuestion | { category_title?: unknown; category_id?: unknown },
  role: RoleNeedsMode
): boolean {
  if (isElderlyStatusQuestion(question)) return false;
  if (role === "nurse" || role === "caregiver") {
    return isRoleNeedsQuestion(question, role);
  }
  return isCareNeedsQuestion(question) || isNursingNeedsQuestion(question);
}

/**
 * Later question phase: non-elderly categories other than the role-linked pair
 * (and never the opposite role category when caregiver/nurse is chosen).
 */
export function isOtherRequestQuestion(
  question: FormQuestion | { category_title?: unknown; category_id?: unknown },
  role: RoleNeedsMode
): boolean {
  if (isElderlyStatusQuestion(question)) return false;
  if (isCareNeedsQuestion(question) || isNursingNeedsQuestion(question)) {
    return false;
  }
  if (role === "nurse" || role === "caregiver") {
    return !isOppositeRoleNeedsQuestion(question, role);
  }
  return true;
}

/** Questions included in nurse-request submit for the chosen role. */
export function isInScopeRequestQuestion(
  question: FormQuestion | { category_title?: unknown; category_id?: unknown },
  role: RoleNeedsMode
): boolean {
  if (isElderlyStatusQuestion(question)) return false;
  if (role === "nurse" || role === "caregiver") {
    return !isOppositeRoleNeedsQuestion(question, role);
  }
  return true;
}
