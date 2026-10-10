export type FieldKind =
  | "phone"
  | "nationalId"
  | "postalCode"
  | "email"
  | "password"
  | "integer"
  | "decimal"
  | "search"
  | "url"
  | "name"
  | "identifier"
  | "description"
  | "text";

export type FieldHints = {
  inputType?: string;
  inputMode?: string;
  type?: string;
  placeholder?: string;
  name?: string;
  ariaLabel?: string;
  autoComplete?: string;
};

export type FieldRules = {
  kind: FieldKind;
  inputType?: "text" | "search" | "url" | "tel" | "email" | "password";
  inputMode?:
    | "text"
    | "tel"
    | "url"
    | "email"
    | "numeric"
    | "decimal"
    | "search";
  maxLength: number;
  minLength?: number;
  pattern?: string;
  autoComplete?: string;
  placeholder: string;
  title?: string;
};

const DIGIT_MAP: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9"
};

const GENERIC_PLACEHOLDER =
  /^(enter something(\.\.\.|…)?|enter value|input here|value|search|select an item|placeholder)?$/i;

const DEFAULT_PLACEHOLDER: Record<FieldKind, string> = {
  phone: "شماره همراه",
  nationalId: "کد ملی",
  postalCode: "کد پستی وارد کنید",
  email: "مثلاً name@example.com",
  password: "رمز عبور خود را وارد کنید",
  integer: "فقط عدد وارد کنید",
  decimal: "مثلاً ۲.۵",
  search: "جستجو کنید...",
  url: "https://example.com",
  name: "مثلاً علی رضایی",
  identifier: "شماره موبایل یا ایمیل",
  description: "توضیحات را بنویسید...",
  text: " "
};

const RULES: Record<FieldKind, Omit<FieldRules, "kind" | "placeholder">> = {
  phone: {
    inputType: "tel",
    inputMode: "tel",
    maxLength: 11,
    pattern: "^0?9\\d{9}$",
    autoComplete: "tel",
    title: "شماره همراه باید ۱۱ رقم و با ۰۹ شروع شود"
  },
  nationalId: {
    inputMode: "numeric",
    maxLength: 10,
    minLength: 10,
    pattern: "^\\d{10}$",
    autoComplete: "off",
    title: "کد ملی باید ۱۰ رقم معتبر باشد"
  },
  postalCode: {
    inputMode: "numeric",
    maxLength: 10,
    minLength: 10,
    pattern: "^\\d{10}$",
    autoComplete: "postal-code",
    title: "کد پستی باید ۱۰ رقم باشد"
  },
  email: {
    inputType: "email",
    inputMode: "email",
    maxLength: 254,
    pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
    autoComplete: "email",
    title: "یک ایمیل معتبر وارد کنید، مثلاً name@example.com"
  },
  password: {
    inputType: "password",
    maxLength: 128,
    autoComplete: "current-password"
  },
  integer: {
    inputMode: "numeric",
    maxLength: 12,
    pattern: "^\\d+$",
    title: "فقط عدد وارد کنید"
  },
  decimal: {
    inputMode: "decimal",
    maxLength: 16,
    pattern: "^\\d+([./٫]\\d+)?$",
    title: "فقط عدد وارد کنید، مثلاً ۲.۵"
  },
  search: {
    inputType: "search",
    inputMode: "search",
    maxLength: 80,
    autoComplete: "off"
  },
  url: {
    inputType: "url",
    inputMode: "url",
    maxLength: 2048,
    autoComplete: "url"
  },
  name: {
    inputType: "text",
    maxLength: 80,
    autoComplete: "name"
  },
  identifier: {
    maxLength: 128,
    autoComplete: "username"
  },
  description: {
    maxLength: 2000
  },
  text: {
    maxLength: 200
  }
};

function hintText(hints: FieldHints): string {
  return [
    hints.placeholder,
    hints.name,
    hints.ariaLabel,
    hints.autoComplete
  ]
    .filter(Boolean)
    .join(" ");
}

function isIdentifierHint(hint: string): boolean {
  return /موبایل\s*یا\s*ایمیل|ایمیل\s*یا\s*موبایل|شماره موبایل یا ایمیل/.test(
    hint
  );
}

function isLandlineContactHint(hint: string): boolean {
  return /ثابت|شماره تماس/.test(hint) && !/شماره همراه/.test(hint);
}

/**
 * Year/duration counters that are authored as `tel` inputs purely to get a
 * numeric keypad. Without this they would be classified as phone numbers and
 * inherit the phone placeholder, pattern and 11-digit rule — which is what
 * made the staff "سال سابقه کاری" field ask for a «شماره همراه».
 */
function isDurationHint(hint: string): boolean {
  return /سابقه|تجربه/.test(hint) && !/موبایل|همراه|تلفن/.test(hint);
}

export function inferFieldKind(hints: FieldHints): FieldKind {
  const type = hints.inputType || hints.type || "text";
  const hint = hintText(hints);

  if (type === "password") return "password";
  if (type === "email" || hints.inputMode === "email") return "email";
  if (type === "url" || hints.inputMode === "url") return "url";
  if (type === "search" || hints.inputMode === "search") return "search";
  if (isIdentifierHint(hint)) return "identifier";
  // Must precede the `tel` check: these fields use a tel input for the keypad.
  if (isDurationHint(hint)) return "integer";
  if (type === "tel" || hints.inputMode === "tel") return "phone";

  if (/کد\s*ملی/.test(hint)) return "nationalId";
  if (/کد\s*پستی|postal/i.test(hint) || hints.autoComplete === "postal-code") {
    return "postalCode";
  }
  if (/ایمیل|email/i.test(hint)) return "email";
  if (/رمز عبور|password/i.test(hint)) return "password";
  if (/جستجو|search/i.test(hint)) return "search";
  if (
    /اینستاگرام|instagram|وب[\s-]*سایت|website|https?:\/\//i.test(hint)
  ) {
    return "url";
  }
  if (
    /موبایل|همراه|شماره تماس|شماره تلفن|09x|09xxxxxxxxx/i.test(hint)
  ) {
    return "phone";
  }
  if (/توضیح|شرح|آدرس|نشانی|متن پرسش|متن اعلان|علت مراجعه/.test(hint)) {
    return "description";
  }
  if (
    /نام و نام خانوادگی|نام مرکز|نام کاربر|نام دسته|نام خدمت/.test(hint)
  ) {
    return "name";
  }
  if (hints.inputMode === "decimal") return "decimal";
  if (hints.inputMode === "numeric" || type === "number") return "integer";
  return "text";
}

function looksLikeExample(placeholder: string): boolean {
  return /مثلاً|مثال:|example@|https?:\/\/|09|۰۹/.test(placeholder);
}

export function improvePlaceholder(
  current: string | undefined,
  kind: FieldKind
): string {
  const trimmed = (current || "").trim();

  if (kind === "nationalId") {
    return DEFAULT_PLACEHOLDER.nationalId;
  }

  if (kind === "phone") {
    if (isLandlineContactHint(trimmed)) {
      if (!trimmed || GENERIC_PLACEHOLDER.test(trimmed) || looksLikeExample(trimmed)) {
        return "شماره تماس (موبایل یا ثابت)";
      }
      return trimmed;
    }
    return DEFAULT_PLACEHOLDER.phone;
  }

  if (!trimmed || GENERIC_PLACEHOLDER.test(trimmed)) {
    return DEFAULT_PLACEHOLDER[kind];
  }
  if (looksLikeExample(trimmed)) return trimmed;

  const replacements: Record<string, string> = {
    "جستجو نام مرکز": "نام مرکز یا خدمت را جستجو کنید",
    "شماره تماس (موبایل یا ثابت)": "شماره تماس (موبایل یا ثابت)",
    "نام و نام خانوادگی": "مثلاً علی رضایی",
    "نام کاربر": "مثلاً علی رضایی",
    "نام کاربری": "مثلاً ali.rezaei",
    "کد پستی": "کد پستی وارد کنید",
    "ایمیل خود را وارد کنید": "مثلاً name@example.com",
    "رمز عبور": "رمز عبور خود را وارد کنید",
    "رمز عبور را وارد کنید": "رمز عبور خود را وارد کنید",
    "رمز عبور جدید": "حداقل ۸ کاراکتر، حروف و عدد",
    "تکرار رمز عبور جدید": "رمز عبور جدید را دوباره وارد کنید",
    "رمز عبور فعلی": "رمز عبور فعلی خود را وارد کنید",
    "example@email.com": "مثلاً name@example.com",
    "عنوان را وارد کنید": "مثلاً یادآوری نوبت",
    "متن اعلان را وارد کنید": "متن اعلان را اینجا بنویسید...",
    "توضیحات تکمیلی": "توضیحات خدمت را بنویسید...",
    "قیمت (تومان)": "مثلاً ۳۰۰۰۰۰",
    "سال‌های تجربه کاری": "مثلاً ۱۰ سال",
    "سابقه کاری": "مثلاً ۱۰ سال",
    "محل سکونت": "مثلاً تهران",
    "Select an item": "یک مورد را انتخاب کنید"
  };

  return replacements[trimmed] || trimmed;
}

export function getFieldRules(hints: FieldHints): FieldRules {
  const kind = inferFieldKind(hints);
  const base = RULES[kind];
  const landlineContact =
    kind === "phone" && isLandlineContactHint(hintText(hints));
  return {
    kind,
    ...base,
    ...(landlineContact
      ? {
          pattern: undefined,
          title: "شماره تماس را وارد کنید"
        }
      : {}),
    placeholder: improvePlaceholder(hints.placeholder, kind)
  };
}

export function toEnglishDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, digit => DIGIT_MAP[digit] ?? digit);
}

export function sanitizeDigits(value: string, maxLength?: number): string {
  const digits = toEnglishDigits(value).replace(/\D/g, "");
  return maxLength ? digits.slice(0, maxLength) : digits;
}

export function sanitizeDecimal(value: string, maxLength = 16): string {
  const normalized = toEnglishDigits(value).replace(/٫/g, ".");
  let sawDot = false;
  let next = "";
  for (const char of normalized) {
    if (char >= "0" && char <= "9") {
      next += char;
    } else if (char === "." && !sawDot) {
      next += char;
      sawDot = true;
    }
  }
  return next.slice(0, maxLength);
}

export function sanitizeFieldValue(
  kind: FieldKind,
  value: string,
  maxLength?: number
): string {
  const limit = maxLength ?? RULES[kind].maxLength;
  switch (kind) {
    case "phone":
    case "nationalId":
    case "postalCode":
    case "integer":
      return sanitizeDigits(value, limit);
    case "decimal":
      return sanitizeDecimal(value, limit);
    case "email":
      return value.replace(/\s/g, "").slice(0, limit);
    default:
      return value.slice(0, limit);
  }
}

export function applyFieldRules<T extends FieldHints & { maxLength?: number }>(
  props: T
): T & {
  kind: FieldKind;
  maxLength: number;
  placeholder: string;
} {
  const rules = getFieldRules(props);
  const maxLength = props.maxLength ?? rules.maxLength;
  return {
    ...props,
    kind: rules.kind,
    maxLength,
    placeholder: rules.placeholder,
    inputType: props.inputType ?? rules.inputType,
    inputMode: props.inputMode ?? rules.inputMode,
    autoComplete: props.autoComplete ?? rules.autoComplete,
    pattern: (props as { pattern?: string }).pattern ?? rules.pattern
  };
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_PATTERN = /^09\d{9}$/;
export const NATIONAL_ID_PATTERN = /^\d{10}$/;
export const POSTAL_CODE_PATTERN = /^\d{10}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function normalizeMobile(value: string): string {
  let digits = sanitizeDigits(value);
  if (digits.startsWith("98") && digits.length >= 12) {
    digits = `0${digits.slice(2)}`;
  }
  if (digits.length === 10 && digits.startsWith("9")) {
    digits = `0${digits}`;
  }
  return digits;
}

export function isValidPhone(value: string): boolean {
  return PHONE_PATTERN.test(normalizeMobile(value));
}

export function isValidNationalId(value: string): boolean {
  const code = sanitizeDigits(value);
  if (!NATIONAL_ID_PATTERN.test(code)) return false;
  // Reject obvious fakes (all same digit) and enforce Iranian checksum.
  if (/^(\d)\1{9}$/.test(code)) return false;

  const check = Number(code[9]);
  const sum = code
    .slice(0, 9)
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (10 - index), 0);
  const remainder = sum % 11;
  return remainder < 2 ? check === remainder : check + remainder === 11;
}

export function getEmailError(
  value: string | null | undefined,
  required = false
): string | undefined {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return required ? "ایمیل را وارد کنید" : undefined;
  }
  if (!isValidEmail(trimmed)) {
    return "ایمیل معتبر نیست";
  }
  return undefined;
}

export function isValidContactPhone(value: string): boolean {
  if (isValidPhone(value)) return true;
  const digits = sanitizeDigits(value);
  return /^0\d{9,10}$/.test(digits);
}

export function getContactPhoneError(
  value: string | null | undefined,
  required = false
): string | undefined {
  const digits = sanitizeDigits(value || "");
  if (!digits) {
    return required ? "شماره تماس را وارد کنید" : undefined;
  }
  if (!isValidContactPhone(value || "")) {
    return "شماره تماس معتبر نیست";
  }
  return undefined;
}

export function passwordStrengthScore(
  password: string | null | undefined
): number {
  const value = String(password ?? "");
  let score = 0;
  const checks = {
    length: value.length >= 8,
    lowercase: /[a-z]/.test(value),
    uppercase: /[A-Z]/.test(value),
    number: /\d/.test(value),
    special: /[@$!%*?&.]/.test(value)
  };
  Object.values(checks).forEach(check => {
    if (check) score += 20;
  });
  return score;
}

export function getPhoneError(
  value: string | null | undefined,
  required = false
): string | undefined {
  const digits = sanitizeDigits(value || "");
  if (!digits) {
    return required ? "لطفا شماره همراه را وارد کنید" : undefined;
  }
  if (!isValidPhone(digits)) {
    return "شماره همراه معتبر نیست";
  }
  return undefined;
}

export function getNationalIdError(
  value: string | null | undefined,
  required = false
): string | undefined {
  const digits = sanitizeDigits(value || "");
  if (!digits) {
    return required ? "لطفا کد ملی را وارد کنید" : undefined;
  }
  // Reported separately from the checksum so a half-typed code says "10 digits"
  // instead of the misleading "کد ملی معتبر نیست".
  if (digits.length !== 10) {
    return "کد ملی باید ۱۰ رقم باشد";
  }
  if (!isValidNationalId(digits)) {
    return "کد ملی معتبر نیست";
  }
  return undefined;
}

export function isValidPostalCode(value: string): boolean {
  return POSTAL_CODE_PATTERN.test(sanitizeDigits(value));
}
