import * as React from "react";
import {
  EMPTY_OWNER_DOCS,
  OWNER_DOCS_LABELS,
  normalizeOwnerDocs,
  type CenterOwnerDocs
} from "./centerOwnerInfo";
import {
  addCenterCredentialsStore,
  useAddCenterAttempted,
  useAddCenterCredentials
} from "./addCenterValidationStore";
import { getOwnerFieldErrors } from "./validateCenterWizard";
import { passwordStrengthScore, sanitizeDigits } from "../formFieldRules";
import styles from "./CenterOwnerInfoForm.module.css";

export type CenterOwnerInfoFormProps = {
  className?: string;
  /** نام خانوادگی مسئول مرکز */
  managerLastName?: string;
  onManagerLastNameChange?: (value: string) => void;
  /** شماره تماس مسئول */
  phone?: string;
  onPhoneChange?: (value: string) => void;
  email?: string;
  onEmailChange?: (value: string) => void;
  docs?: unknown;
  onDocsChange?: (value: CenterOwnerDocs) => void;
};

/**
 * «اطلاعات مسئول مرکز» section of the add-center wizard.
 *
 * Collects owner dossier + login password. n8n `/panel/center/add` →
 * Register User hashes `body.password` into `panel__users`.
 */
export default function CenterOwnerInfoForm({
  className,
  managerLastName = "",
  onManagerLastNameChange,
  phone = "",
  onPhoneChange,
  email = "",
  onEmailChange,
  docs,
  onDocsChange
}: CenterOwnerInfoFormProps) {
  const attempted = useAddCenterAttempted();
  const credentials = useAddCenterCredentials();
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const values = React.useMemo(
    () => (docs == null ? EMPTY_OWNER_DOCS : normalizeOwnerDocs(docs)),
    [docs]
  );

  const fieldErrors = React.useMemo(
    () =>
      getOwnerFieldErrors({
        managerLastName,
        phone,
        email,
        docs: values,
        password: credentials.password,
        repeatPassword: credentials.repeatPassword,
        requirePassword: true
      }),
    [managerLastName, phone, email, values, credentials]
  );

  const strength = passwordStrengthScore(credentials.password);

  const show = (key: keyof typeof fieldErrors) =>
    Boolean(fieldErrors[key] && (attempted || touched[key]));

  const patchDocs = (key: keyof CenterOwnerDocs, value: string) => {
    onDocsChange?.({ ...values, [key]: value });
  };

  const docFields: (keyof CenterOwnerDocs)[] = [
    "registered_center_name",
    "license_number",
    "establishment_notice",
    "registration_docs"
  ];

  return (
    <section className={[styles.root, className].filter(Boolean).join(" ")}>
      <header className={styles.header}>
        <h3 className={styles.title}>اطلاعات مسئول مرکز</h3>
        <p className={styles.hint}>
          این اطلاعات برای احراز هویت مرکز و ساخت حساب مدیریت استفاده می‌شود.
          رمز عبور برای ورود مسئول به پنل لازم است.
        </p>
      </header>

      <div className={styles.grid}>
        <label className={styles.field}>
          <span className={styles.label}>نام خانوادگی مسئول</span>
          <input
            className={styles.input}
            type="text"
            value={managerLastName}
            placeholder="نام خانوادگی مسئول مرکز"
            aria-invalid={show("managerLastName") ? "true" : undefined}
            onBlur={() =>
              setTouched(prev => ({ ...prev, managerLastName: true }))
            }
            onChange={event => onManagerLastNameChange?.(event.target.value)}
          />
          {show("managerLastName") ? (
            <span className={styles.error}>{fieldErrors.managerLastName}</span>
          ) : null}
        </label>

        {docFields.map(key => (
          <label className={styles.field} key={key}>
            <span className={styles.label}>{OWNER_DOCS_LABELS[key]}</span>
            <input
              className={styles.input}
              type="text"
              value={values[key]}
              placeholder={
                key === "registered_center_name"
                  ? "نام ثبت‌شده مرکز"
                  : "شماره یا شناسه مدرک"
              }
              aria-invalid={show(key) ? "true" : undefined}
              onBlur={() => setTouched(prev => ({ ...prev, [key]: true }))}
              onChange={event => patchDocs(key, event.target.value)}
            />
            {show(key) ? (
              <span className={styles.error}>{fieldErrors[key]}</span>
            ) : null}
          </label>
        ))}

        <label className={styles.field}>
          <span className={styles.label}>شماره تماس</span>
          <input
            className={styles.input}
            type="tel"
            inputMode="numeric"
            dir="ltr"
            value={phone}
            placeholder="09xxxxxxxxx"
            aria-invalid={show("phone") ? "true" : undefined}
            onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
            onChange={event =>
              onPhoneChange?.(sanitizeDigits(event.target.value, 11))
            }
          />
          {show("phone") ? (
            <span className={styles.error}>{fieldErrors.phone}</span>
          ) : null}
        </label>

        <label className={styles.field}>
          <span className={styles.label}>ایمیل</span>
          <input
            className={styles.input}
            type="email"
            dir="ltr"
            value={email}
            placeholder="example@email.com"
            aria-invalid={show("email") ? "true" : undefined}
            onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
            onChange={event => onEmailChange?.(event.target.value)}
          />
          {show("email") ? (
            <span className={styles.error}>{fieldErrors.email}</span>
          ) : null}
        </label>

        <label className={styles.field}>
          <span className={styles.label}>رمز عبور</span>
          <input
            className={styles.input}
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={credentials.password}
            placeholder="حداقل ۸ کاراکتر"
            aria-invalid={show("password") ? "true" : undefined}
            onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
            onChange={event =>
              addCenterCredentialsStore.set({ password: event.target.value })
            }
          />
          {credentials.password ? (
            <span className={styles.hint} aria-live="polite">
              قدرت رمز: {strength}%
            </span>
          ) : null}
          {show("password") ? (
            <span className={styles.error}>{fieldErrors.password}</span>
          ) : null}
        </label>

        <label className={styles.field}>
          <span className={styles.label}>تکرار رمز عبور</span>
          <input
            className={styles.input}
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={credentials.repeatPassword}
            placeholder="تکرار رمز عبور"
            aria-invalid={show("repeatPassword") ? "true" : undefined}
            onBlur={() =>
              setTouched(prev => ({ ...prev, repeatPassword: true }))
            }
            onChange={event =>
              addCenterCredentialsStore.set({
                repeatPassword: event.target.value
              })
            }
          />
          {show("repeatPassword") ? (
            <span className={styles.error}>{fieldErrors.repeatPassword}</span>
          ) : null}
        </label>
      </div>
    </section>
  );
}
