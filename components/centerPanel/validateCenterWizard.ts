import { toDbEnumValue } from "../centerPage/centerEnumLocales";
import {
  getContactPhoneError,
  getEmailError,
  getPhoneError,
  isValidEmail,
  isValidPhone,
  passwordStrengthScore
} from "../formFieldRules";
import {
  normalizeOwnerDocs,
  OWNER_DOCS_LABELS,
  type CenterOwnerDocs
} from "./centerOwnerInfo";

export type OwnerFieldErrors = Partial<
  Record<
    | "managerLastName"
    | "phone"
    | "email"
    | "password"
    | "repeatPassword"
    | keyof CenterOwnerDocs,
    string
  >
>;

export type CenterInfoFieldErrors = Partial<
  Record<"title" | "description" | "careDomain" | "centerType" | "subcategory", string>
>;

export type LocationFieldErrors = Partial<
  Record<"address" | "city" | "state" | "phone", string>
>;

export type CreateStep1FieldErrors = Partial<
  Record<"centerName" | "email" | "password" | "repeatPassword", string>
>;

export function getOwnerFieldErrors(input: {
  managerLastName?: string | null;
  phone?: string | null;
  email?: string | null;
  docs?: unknown;
  password?: string | null;
  repeatPassword?: string | null;
  /** When false, skip password checks (legacy callers). Default true for add-center. */
  requirePassword?: boolean;
}): OwnerFieldErrors {
  const errors: OwnerFieldErrors = {};
  if (!String(input.managerLastName || "").trim()) {
    errors.managerLastName = "نام خانوادگی مسئول را وارد کنید.";
  }

  const docs = normalizeOwnerDocs(input.docs);
  (Object.keys(OWNER_DOCS_LABELS) as (keyof CenterOwnerDocs)[]).forEach(key => {
    if (!docs[key]) {
      errors[key] = `${OWNER_DOCS_LABELS[key]} را وارد کنید.`;
    }
  });

  const phone = String(input.phone || "").trim();
  const email = String(input.email || "").trim();
  if (!phone && !email) {
    errors.phone = "ایمیل یا شماره موبایل را وارد کنید.";
    errors.email = "ایمیل یا شماره موبایل را وارد کنید.";
  } else {
    const phoneError = getPhoneError(phone, Boolean(phone) || !email);
    if (phoneError) errors.phone = phoneError;
    const emailError = getEmailError(email, Boolean(email) || !phone);
    if (emailError) errors.email = emailError;
  }

  if (input.requirePassword !== false) {
    const password = String(input.password || "");
    const repeatPassword = String(input.repeatPassword || "");
    if (!password) {
      errors.password = "رمز عبور را وارد کنید.";
    } else if (passwordStrengthScore(password) < 60) {
      errors.password = "رمز عبور ضعیف است.";
    }
    if (!repeatPassword) {
      errors.repeatPassword = "تکرار رمز عبور را وارد کنید.";
    } else if (password && password !== repeatPassword) {
      errors.repeatPassword = "رمز عبور و تکرار آن یکسان نیست.";
    }
  }

  return errors;
}

export function getCenterInfoFieldErrors(input: {
  title?: string | null;
  description?: string | null;
  careDomain?: string | null;
  centerType?: string | null;
  subcategory?: string | null;
}): CenterInfoFieldErrors {
  const errors: CenterInfoFieldErrors = {};
  if (!String(input.title || "").trim()) {
    errors.title = "نام مرکز را وارد کنید.";
  }
  if (!String(input.description || "").trim()) {
    errors.description = "توضیحات را وارد کنید.";
  }
  // careDomain / centerType / subcategory دیگر بررسی نمی‌شوند
  // و مانع رفتن به تب بعدی نخواهند شد.
  return errors;
}

export function getLocationFieldErrors(input: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
}): LocationFieldErrors {
  const errors: LocationFieldErrors = {};
  if (!String(input.address || "").trim()) {
    errors.address = "آدرس را وارد کنید.";
  }
  if (!String(input.city || "").trim()) {
    errors.city = "شهر را انتخاب کنید.";
  }
  if (!String(input.state || "").trim()) {
    errors.state = "استان را انتخاب کنید.";
  }
  const phoneError = getContactPhoneError(input.phone, true);
  if (phoneError) {
    errors.phone =
      phoneError === "شماره تماس را وارد کنید"
        ? "شماره تماس مرکز را در بخش آدرس وارد کنید."
        : phoneError;
  }
  return errors;
}

export function getImagesError(files: unknown): string | null {
  if (!files) return "تصویر را آپلود کنید.";
  if (!Array.isArray(files) || files.length < 1) {
    return "حداقل یک تصویر اضافه کنید.";
  }
  return null;
}

export function getCreateStep1FieldErrors(input: {
  centerName?: string | null;
  email?: string | null;
  password?: string | null;
  repeatPassword?: string | null;
  passwordStrengthScore: (password: string) => number;
}): CreateStep1FieldErrors {
  const errors: CreateStep1FieldErrors = {};
  if (!String(input.centerName || "").trim()) {
    errors.centerName = "نام مرکز را وارد کنید.";
  }
  const emailError = getEmailError(input.email, true);
  if (emailError) errors.email = emailError;
  if (!input.password) {
    errors.password = "رمز عبور را وارد کنید.";
  } else if (input.passwordStrengthScore(input.password) < 60) {
    errors.password = "رمز عبور ضعیف است.";
  }
  if (!input.repeatPassword) {
    errors.repeatPassword = "تکرار رمز عبور را وارد کنید.";
  } else if (input.password && input.password !== input.repeatPassword) {
    errors.repeatPassword = "رمز عبور و تکرار آن یکسان نیست.";
  }
  return errors;
}

/** Flatten field-error maps into toast lines (stable order). */
export function flattenFieldErrors(
  ...groups: Array<Record<string, string | undefined>>
): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    for (const message of Object.values(group)) {
      if (!message || seen.has(message)) continue;
      seen.add(message);
      lines.push(message);
    }
  }
  return lines;
}

export function validateAddCenterTab(
  tabKey: string,
  state: {
    managerLastName?: string | null;
    phone?: string | null;
    email?: string | null;
    docs?: unknown;
    password?: string | null;
    repeatPassword?: string | null;
    title?: string | null;
    description?: string | null;
    careDomain?: string | null;
    centerType?: string | null;
    subcategory?: string | null;
    address?: string | null;
    city?: string | null;
    region?: string | null;
    call?: string | null;
    images?: unknown;
  }
): string[] {
  switch (String(tabKey)) {
    case "1":
      return flattenFieldErrors(
        getOwnerFieldErrors({
          managerLastName: state.managerLastName,
          phone: state.phone,
          email: state.email,
          docs: state.docs,
          password: state.password,
          repeatPassword: state.repeatPassword,
          requirePassword: true
        })
      );
    case "2":
      return flattenFieldErrors(
        getCenterInfoFieldErrors({
          title: state.title,
          description: state.description,
          careDomain: state.careDomain,
          centerType: state.centerType,
          subcategory: state.subcategory
        })
      );
    case "3": {
      const imageError = getImagesError(state.images);
      return imageError ? [imageError] : [];
    }
    case "4":
      return flattenFieldErrors(
        getLocationFieldErrors({
          address: state.address,
          city: state.city,
          state: state.region,
          phone: state.call
        })
      );
    default:
      return [];
  }
}

export function validateAddCenterAll(state: {
  managerLastName?: string | null;
  phone?: string | null;
  email?: string | null;
  docs?: unknown;
  password?: string | null;
  repeatPassword?: string | null;
  title?: string | null;
  description?: string | null;
  careDomain?: string | null;
  centerType?: string | null;
  subcategory?: string | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  call?: string | null;
  images?: unknown;
}): string[] {
  return [
    ...validateAddCenterTab("1", state),
    ...validateAddCenterTab("2", state),
    ...validateAddCenterTab("3", state),
    ...validateAddCenterTab("4", state)
  ].filter((message, index, all) => all.indexOf(message) === index);
}

/** Keep legacy helpers used elsewhere compiling cleanly. */
export function isOwnerContactValid(phone?: string | null, email?: string | null) {
  const p = String(phone || "").trim();
  const e = String(email || "").trim();
  if (!p && !e) return false;
  if (p && !isValidPhone(p)) return false;
  if (e && !isValidEmail(e)) return false;
  return true;
}