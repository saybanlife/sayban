/**
 * Prefills the in-home service questionnaire from whoever the request is for.
 *
 * The questionnaire is admin-defined (`centers__question`), so questions are
 * matched by `type` and by keywords in `question_text` rather than by id — a
 * renamed or newly added question keeps working, and anything unrecognised is
 * simply left for the user to answer.
 *
 * Only facts about the person are filled. Preferences and scheduling (preferred
 * carer gender, start date/time, duration, notes, phone-consultation) are
 * deliberately left blank because they are choices, not stored data.
 */

export type BookingPerson = {
  name?: string;
  national_code?: string;
  mobile?: string;
  gender?: string;
  city?: string;
  address?: string;
  details?: string;
  postal_code?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

export type QuestionnaireQuestion = {
  question_text?: unknown;
  type?: unknown;
  options?: unknown;
};

function text(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

function hasAnyKey(value: unknown): boolean {
  return Boolean(
    value && typeof value === "object" && Object.keys(value).length > 0
  );
}

/**
 * Which person the request is for: the chosen companion, otherwise the signed-in
 * user. Returns null when neither is loaded yet.
 */
export function resolveBookingPerson(
  userSelect: unknown,
  profile: unknown
): BookingPerson | null {
  const source = hasAnyKey(userSelect)
    ? (userSelect as Record<string, unknown>)
    : hasAnyKey(profile)
      ? (profile as Record<string, unknown>)
      : null;

  if (!source) return null;

  // The profile endpoint splits the name; companions store it in one column.
  const fullName =
    text(source.name) ||
    [text(source.first_name), text(source.last_name)].filter(Boolean).join(" ");

  return {
    name: fullName || undefined,
    national_code: text(source.national_code) || undefined,
    mobile: text(source.mobile) || text(source.phone) || undefined,
    gender: text(source.gender) || undefined,
    city: text(source.city) || undefined,
    address: text(source.address) || undefined,
    details: text(source.details) || undefined,
    postal_code: text(source.postal_code) || undefined,
    latitude: (source.latitude as number | string | null) ?? null,
    longitude: (source.longitude as number | string | null) ?? null
  };
}

function parseOptions(options: unknown): string[] {
  if (Array.isArray(options)) return options.map(o => text(o)).filter(Boolean);
  const raw = text(options);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(o => text(o)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * Maps a stored gender onto whichever wording the question offers, so the
 * prefilled value is always selectable in the dropdown.
 */
function genderOption(gender: string, options: string[]): string | undefined {
  const isFemale = /^(female|f|زن|خانم)$/i.test(gender);
  const isMale = /^(male|m|مرد|آقا)$/i.test(gender);
  if (!isFemale && !isMale) return undefined;

  const wanted = isFemale ? /زن|خانم/ : /مرد|آقا/;
  const match = options.find(option => wanted.test(option));
  if (match) return match;

  // No options declared: fall back to the wording used across the app.
  return options.length ? undefined : isFemale ? "خانم" : "آقا";
}

/** The service recipient's own gender — not the preferred carer's. */
function isRecipientGenderQuestion(label: string): boolean {
  return /جنسیت/.test(label) && !/پرستار|مراقب|ترجیح/.test(label);
}

function isNationalIdQuestion(label: string): boolean {
  return /کد\s*ملی/.test(label);
}

function isNameQuestion(label: string): boolean {
  return /نام/.test(label) && !/نام\s*مرکز/.test(label);
}

function isMobileQuestion(label: string): boolean {
  return /موبایل|همراه|تلفن|شماره\s*تماس/.test(label);
}

/**
 * The value to prefill for one question, or undefined to leave it empty.
 * Address questions return the object shape `AddressDialog` stores.
 */
export function autofillAnswerFor(
  question: QuestionnaireQuestion | null | undefined,
  person: BookingPerson | null | undefined
): string | Record<string, unknown> | undefined {
  if (!question || !person) return undefined;

  const label = text(question.question_text);
  const type = text(question.type);

  if (type === "address") {
    // A city on its own is not somewhere a carer can be sent, so the picker is
    // left for the user rather than prefilled with half an address.
    if (!person.address) return undefined;
    return {
      city: person.city ?? "",
      address: person.address ?? "",
      details: person.details ?? "",
      postal_code: person.postal_code ?? "",
      latitude: person.latitude ?? null,
      longitude: person.longitude ?? null
    };
  }

  // Choices and scheduling are the user's to make.
  if (type === "date" || type === "time" || type === "checkbox") {
    return undefined;
  }

  if (type === "single_choice") {
    if (!isRecipientGenderQuestion(label) || !person.gender) return undefined;
    return genderOption(person.gender, parseOptions(question.options));
  }

  if (isNationalIdQuestion(label)) return person.national_code || undefined;
  if (isMobileQuestion(label)) return person.mobile || undefined;
  if (isNameQuestion(label)) return person.name || undefined;

  return undefined;
}

/**
 * True when a question is one this module fills, i.e. safe to overwrite when the
 * selected person changes. Questions the user answered themselves are untouched.
 */
export function isAutofillableQuestion(
  question: QuestionnaireQuestion | null | undefined
): boolean {
  if (!question) return false;
  const label = text(question.question_text);
  const type = text(question.type);

  if (type === "address") return true;
  if (type === "date" || type === "time" || type === "checkbox") return false;
  if (type === "single_choice") return isRecipientGenderQuestion(label);
  return (
    isNationalIdQuestion(label) ||
    isMobileQuestion(label) ||
    isNameQuestion(label)
  );
}
