import * as React from "react";
import { useRouter } from "next/router";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import type { DefaultAddPatientProps } from "./plasmic/sayban/PlasmicAddPatient";
import Header from "./Header";
import PanelDatePicker from "./datetime/PanelDatePicker";
import InfoCircleIcon from "./plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__InfoCircle";
import CalendarIcon from "./plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Calendar";
import {
  clearEditPatient,
  readEditPatient
} from "./user/patientAddressApi";
import { goBackOrReplace } from "./navigation/backNavigation";
import {
  formatJalaliShort,
  parseDate,
  todayJalali,
  toPersianDigits,
  type DateValue
} from "@/lib/datetime";
import styles from "./AddPatient.module.css";

export interface AddPatientProps extends DefaultAddPatientProps {}

const RELATION_OPTIONS = [
  { value: "mother", label: "مادر" },
  { value: "father", label: "پدر" },
  { value: "spouse", label: "همسر" },
  { value: "grandmother", label: "مادربزرگ" },
  { value: "grandfather", label: "پدربزرگ" },
  { value: "other", label: "دیگر" }
] as const;

function isAddPatientPath(path?: string) {
  return Boolean(path && /addPatient/i.test(path));
}

function faDigits(value: string | number) {
  return String(value).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

function ageFromBirthDate(value: DateValue): number | null {
  const canonical = parseDate(value);
  if (!canonical) return null;
  const [year, month, day] = canonical.split("-").map(Number);
  if (!year || !month || !day) return null;
  const birth = new Date(year, month - 1, day);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) age -= 1;
  if (age < 0 || age > 130) return null;
  return age;
}

function genderFromRelation(relation: string): string | null {
  if (
    relation === "mother" ||
    relation === "sister" ||
    relation === "grandmother"
  ) {
    return "female";
  }
  if (
    relation === "father" ||
    relation === "brother" ||
    relation === "grandfather"
  ) {
    return "male";
  }
  return null;
}

function normalizeRelation(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw === "grandparent") return "grandmother";
  if (RELATION_OPTIONS.some(option => option.value === raw)) return raw;
  return raw;
}

function AddPatient_(props: AddPatientProps, ref: HTMLElementRefOf<"div">) {
  const router = useRouter();
  const $globalActions = useGlobalActions?.();
  const editId = React.useMemo(() => {
    const raw = router.query.edit;
    const id = Number(Array.isArray(raw) ? raw[0] : raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }, [router.query.edit]);
  const editRecord = React.useMemo(
    () => (editId ? readEditPatient() : null),
    [editId]
  );
  const isEdit = Boolean(editId && editRecord?.id);
  const isActive = isAddPatientPath(router.asPath);
  const today = todayJalali();

  const [name, setName] = React.useState("");
  const [birthDate, setBirthDate] = React.useState<DateValue>("");
  const [relation, setRelation] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const prefilledRef = React.useRef(false);

  const showToast = React.useCallback(
    (type: "error" | "success", message: string) => {
      $globalActions?.["Fragment.showToast"]?.(type, message, "bottom-center");
    },
    [$globalActions]
  );

  React.useEffect(() => {
    if (!isActive) {
      prefilledRef.current = false;
      clearEditPatient();
      return;
    }
    if (prefilledRef.current) return;
    prefilledRef.current = true;
    if (isEdit && editRecord) {
      setName(String(editRecord.name || "").trim());
      setRelation(normalizeRelation(editRecord.relation));
      const birth = String(
        (editRecord as { birth_date?: unknown }).birth_date || ""
      ).trim();
      setBirthDate(parseDate(birth) || "");
      return;
    }
    setName("");
    setBirthDate("");
    setRelation("");
    setError("");
  }, [isActive, isEdit, editRecord]);

  const age = ageFromBirthDate(birthDate);
  const ageLabel = age != null ? `${faDigits(age)} ساله` : "";
  const birthDisplay = birthDate ? formatJalaliShort(birthDate) : "";

  const goBack = () => {
    const pageBase =
      typeof router.query.page === "string" && router.query.page
        ? router.query.page
        : "home";
    goBackOrReplace(router, `/${pageBase}/`);
  };

  const save = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("لطفاً نام سالمند را وارد کنید.");
      return;
    }
    if (!parseDate(birthDate)) {
      setError("لطفاً تاریخ تولد را انتخاب کنید.");
      return;
    }
    if (!relation) {
      setError("لطفاً نسبت با خودتان را انتخاب کنید.");
      return;
    }

    const api = $globalActions?.["Fragment.apiRequest"];
    if (typeof api !== "function") {
      setError("امکان ذخیره الان وجود ندارد. دوباره تلاش کنید.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        name: trimmedName,
        relation,
        birth_date: birthDate,
        national_code: null,
        mobile: null,
        gender: genderFromRelation(relation),
        marital_status: null
      };
      if (isEdit && editId) {
        body.id = editId;
      }

      const result = await api(
        "POST",
        isEdit ? "update/patient" : "/add/patients",
        undefined,
        body,
        undefined
      );
      if (result?.success === false) {
        throw new Error(
          String(result?.message || "ذخیره اطلاعات ناموفق بود.")
        );
      }

      if (isEdit) clearEditPatient();
      showToast(
        "success",
        isEdit ? "اطلاعات سالمند به‌روز شد." : "سالمند ذخیره شد."
      );
      await props.addNew?.();
      if (!props.addNew) goBack();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "ذخیره اطلاعات ناموفق بود.";
      setError(message);
      showToast("error", message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={ref}
      className={[styles.page, props.className].filter(Boolean).join(" ")}
      dir="rtl"
    >
      <Header
        className={styles.header}
        slot={isEdit ? "ویرایش سالمند" : "افزودن سالمند"}
        search={false}
        runCode
        back={goBack}
      />

      <div className={styles.body}>
        <div className={styles.intro}>
          <h1>{isEdit ? "ویرایش سالمند" : "افزودن سالمند"}</h1>
          <p>فقط ۳ چیز می‌پرسیم. باقی را در مراحل بعد می‌پرسیم.</p>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>نام سالمند</span>
          <input
            className={styles.input}
            value={name}
            maxLength={120}
            placeholder="مثلاً مادربزرگ فاطمه"
            onChange={event => setName(event.target.value)}
          />
        </label>

        <div className={styles.field}>
          <span className={styles.label}>تاریخ تولد</span>
          <div className={styles.dobWrap}>
            <PanelDatePicker
              className={styles.dobPicker}
              value={birthDate}
              onChange={setBirthDate}
              placeholder="تاریخ تولد را انتخاب کنید"
              minYear={today.jy - 120}
              maxYear={today.jy}
            />
            <span className={styles.dobIcon} aria-hidden>
              <CalendarIcon className={styles.dobGlyph} />
            </span>
            {ageLabel ? (
              <span className={styles.ageBadge}>{ageLabel}</span>
            ) : null}
          </div>
          <span className={styles.hint}>
            سن را خودمان از روی تاریخ تولد حساب می‌کنیم
          </span>
          {birthDisplay ? (
            <span className={styles.srOnly}>
              تاریخ انتخاب‌شده: {toPersianDigits(birthDisplay)}
            </span>
          ) : null}
        </div>

        <fieldset className={styles.relationFieldset}>
          <legend className={styles.label}>نسبت با شما</legend>
          <div className={styles.relationChips}>
            {RELATION_OPTIONS.map(option => {
              const selected = relation === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  className={
                    selected ? styles.relationChipSelected : styles.relationChip
                  }
                  onClick={() => setRelation(option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className={styles.notice}>
          <InfoCircleIcon className={styles.noticeIcon} aria-hidden />
          <span>
            این اطلاعات ذخیره می‌شود تا دفعهٔ بعد لازم نباشد دوباره بنویسید.
          </span>
        </div>

        {error ? (
          <div className={styles.error} role="alert">
            {error}
          </div>
        ) : null}
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.primary}
          disabled={saving}
          onClick={() => {
            void save();
          }}
        >
          {saving ? "در حال ذخیره…" : "ذخیره و ادامه"}
        </button>
      </div>
    </div>
  );
}

const AddPatient = React.forwardRef(AddPatient_);
export default AddPatient;
