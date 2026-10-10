/**
 * «اطلاعات مسئول مرکز» — the registration dossier collected when a center is
 * added (plus password via addCenterCredentialsStore). Contact phone/email stay
 * on the existing `mobileValue` / `emailvalue` state slots.
 */
export type CenterOwnerDocs = {
  /** آگهی تأسیس */
  establishment_notice: string;
  /** شماره مجوز فعالیت */
  license_number: string;
  /** مدارک ثبتی */
  registration_docs: string;
  /** نام مرکز، همان‌طور که در مدارک ثبت شده */
  registered_center_name: string;
};

export const EMPTY_OWNER_DOCS: CenterOwnerDocs = {
  establishment_notice: "",
  license_number: "",
  registration_docs: "",
  registered_center_name: ""
};

export const OWNER_DOCS_LABELS: Record<keyof CenterOwnerDocs, string> = {
  establishment_notice: "آگهی تأسیس",
  license_number: "مجوز",
  registration_docs: "مدارک ثبتی",
  registered_center_name: "نام مرکز"
};

/** Accepts any partial/unknown shape (Plasmic object state) and fills gaps. */
export function normalizeOwnerDocs(raw: unknown): CenterOwnerDocs {
  const src =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const read = (key: keyof CenterOwnerDocs) => String(src[key] ?? "").trim();
  return {
    establishment_notice: read("establishment_notice"),
    license_number: read("license_number"),
    registration_docs: read("registration_docs"),
    registered_center_name: read("registered_center_name")
  };
}

/**
 * Returns the first missing required field label, or null when complete.
 * Kept separate from the form so the add-center wizard can reuse it.
 */
export function validateOwnerDocs(raw: unknown): string | null {
  const docs = normalizeOwnerDocs(raw);
  const required: (keyof CenterOwnerDocs)[] = [
    "registered_center_name",
    "license_number",
    "establishment_notice",
    "registration_docs"
  ];
  for (const key of required) {
    if (!docs[key]) {
      return `${OWNER_DOCS_LABELS[key]} را وارد کنید.`;
    }
  }
  return null;
}
