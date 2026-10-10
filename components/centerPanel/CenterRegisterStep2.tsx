import * as React from "react";
import { classNames } from "@plasmicapp/react-web";
import { _useStyleTokens } from "../plasmic/sayban/PlasmicStyleTokensProvider";
import Button from "../Button";
import {
  CARE_DOMAIN_FA_OPTIONS,
  toDbEnumValue
} from "../centerPage/centerEnumLocales";
import {
  getEmailError,
  getPhoneError
} from "../formFieldRules";
import {
  IMAGE_ACCEPT_ATTR,
  MAX_IMAGE_UPLOAD_MB,
  describeImageRejection
} from "../uploadLimits";
import styles from "./CenterRegisterStep2.module.css";

export type CenterRegisterCredentials = {
  centerName: string;
  email: string;
  password: string;
};

export type CenterRegisterDetails = {
  careDomainFa: string;
  managerLastName: string;
  centerName: string;
  phone: string;
  establishmentNotice: File | null;
  license: File | null;
  registrationDocs: File | null;
};

type FieldErrors = Partial<
  Record<
    | "careDomainFa"
    | "managerLastName"
    | "centerName"
    | "phone"
    | "establishmentNotice"
    | "license"
    | "registrationDocs",
    string
  >
>;

type CenterRegisterStep2Props = {
  className?: string;
  credentials: CenterRegisterCredentials;
  submitting?: boolean;
  onBack: () => void;
  onSubmit: (payload: {
    details: CenterRegisterDetails;
    files: {
      establishment_notice: File;
      license_number: File;
      registration_docs: File;
    };
  }) => void;
};

function ImagePick({
  label,
  file,
  previewUrl,
  error,
  disabled,
  onPick,
  onClear
}: {
  label: string;
  file: File | null;
  previewUrl: string;
  error?: string;
  disabled?: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className={styles.uploadCard}>
      <span className={styles.label}>{label}</span>
      <input
        ref={inputRef}
        className={styles.hiddenInput}
        type="file"
        accept={IMAGE_ACCEPT_ATTR}
        disabled={disabled}
        onChange={event => {
          const next = event.target.files?.[0];
          if (next) onPick(next);
          event.target.value = "";
        }}
      />
      {previewUrl ? (
        <div className={styles.preview}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="" className={styles.previewImg} />
          <button
            type="button"
            className={styles.clearBtn}
            onClick={onClear}
            disabled={disabled}
            aria-label={`حذف ${label}`}
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={styles.uploadButton}
          data-invalid={error ? "true" : undefined}
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          <span className={styles.uploadPlus}>+</span>
          <span>بارگذاری تصویر</span>
          <span className={styles.uploadHint}>
            JPG، PNG یا WEBP · حداکثر {MAX_IMAGE_UPLOAD_MB} مگابایت
          </span>
        </button>
      )}
      {file ? <span className={styles.fileName}>{file.name}</span> : null}
      {error ? <span className={styles.error}>{error}</span> : null}
    </div>
  );
}

export default function CenterRegisterStep2({
  className,
  credentials,
  submitting = false,
  onBack,
  onSubmit
}: CenterRegisterStep2Props) {
  const styleTokensClassNames = _useStyleTokens();
  const [careDomainFa, setCareDomainFa] = React.useState("");
  const [managerLastName, setManagerLastName] = React.useState("");
  const [centerName, setCenterName] = React.useState(credentials.centerName);
  const [phone, setPhone] = React.useState("");
  const [establishmentNotice, setEstablishmentNotice] =
    React.useState<File | null>(null);
  const [license, setLicense] = React.useState<File | null>(null);
  const [registrationDocs, setRegistrationDocs] = React.useState<File | null>(
    null
  );
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [encoding, setEncoding] = React.useState(false);

  const noticePreview = React.useMemo(
    () => (establishmentNotice ? URL.createObjectURL(establishmentNotice) : ""),
    [establishmentNotice]
  );
  const licensePreview = React.useMemo(
    () => (license ? URL.createObjectURL(license) : ""),
    [license]
  );
  const docsPreview = React.useMemo(
    () => (registrationDocs ? URL.createObjectURL(registrationDocs) : ""),
    [registrationDocs]
  );

  React.useEffect(() => {
    return () => {
      if (noticePreview) URL.revokeObjectURL(noticePreview);
    };
  }, [noticePreview]);
  React.useEffect(() => {
    return () => {
      if (licensePreview) URL.revokeObjectURL(licensePreview);
    };
  }, [licensePreview]);
  React.useEffect(() => {
    return () => {
      if (docsPreview) URL.revokeObjectURL(docsPreview);
    };
  }, [docsPreview]);

  const pickImage = (
    file: File,
    setter: (file: File | null) => void,
    key: keyof FieldErrors
  ) => {
    const reason = describeImageRejection(file);
    if (reason) {
      setter(null);
      setErrors(prev => ({ ...prev, [key]: reason }));
      return;
    }
    setter(file);
    setErrors(prev => ({ ...prev, [key]: undefined }));
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (!toDbEnumValue("care_domain", careDomainFa)) {
      next.careDomainFa = "نوع مرکز را انتخاب کنید.";
    }
    if (!managerLastName.trim()) {
      next.managerLastName = "نام خانوادگی مسئول را وارد کنید.";
    }
    if (!centerName.trim()) {
      next.centerName = "نام مرکز را وارد کنید.";
    }
    const phoneError = getPhoneError(phone, true);
    if (phoneError) next.phone = phoneError;
    if (!establishmentNotice) {
      next.establishmentNotice = "تصویر آگهی تأسیس را بارگذاری کنید.";
    }
    if (!license) next.license = "تصویر مجوز را بارگذاری کنید.";
    if (!registrationDocs) {
      next.registrationDocs = "تصویر مدارک ثبتی را بارگذاری کنید.";
    }
    return next;
  };

  const handleSubmit = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    if (!establishmentNotice || !license || !registrationDocs) return;

    setEncoding(true);
    try {
      onSubmit({
        details: {
          careDomainFa,
          managerLastName: managerLastName.trim(),
          centerName: centerName.trim(),
          phone: phone.trim(),
          establishmentNotice,
          license,
          registrationDocs
        },
        files: {
          establishment_notice: establishmentNotice,
          license_number: license,
          registration_docs: registrationDocs
        }
      });
    } finally {
      setEncoding(false);
    }
  };

  const busy = submitting || encoding;
  const emailHint = getEmailError(credentials.email)
    ? null
    : credentials.email;

  return (
    <div
      dir="rtl"
      className={classNames(
        "all",
        "root_reset_qARqpE4p5tZmJuNxFbTaPz",
        "plasmic_default_styles",
        "plasmic_mixins",
        styleTokensClassNames,
        styles.root,
        "dark",
        className
      )}
    >
      <header className={styles.header}>
        <p className={styles.step}>مرحله ۲ از ۲ — اطلاعات مرکز</p>
        <h2 className={styles.title}>اطلاعات مرکز</h2>
        <p className={styles.subtitle}>
          {emailHint
            ? `مدارک و مشخصات مرکز را برای ایمیل ${emailHint} تکمیل کنید.`
            : "مدارک و مشخصات مرکز را تکمیل کنید."}
        </p>
      </header>

      <div className={styles.form}>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span className={styles.label}>نوع مرکز</span>
            <select
              className={styles.select}
              value={careDomainFa}
              aria-invalid={Boolean(errors.careDomainFa)}
              disabled={busy}
              onChange={event => {
                setCareDomainFa(event.target.value);
                setErrors(prev => ({ ...prev, careDomainFa: undefined }));
              }}
            >
              <option value="">انتخاب کنید</option>
              {CARE_DOMAIN_FA_OPTIONS.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.careDomainFa ? (
              <span className={styles.error}>{errors.careDomainFa}</span>
            ) : null}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>نام خانوادگی مسئول</span>
            <input
              className={styles.input}
              type="text"
              value={managerLastName}
              placeholder="نام خانوادگی مسئول مرکز"
              aria-invalid={Boolean(errors.managerLastName)}
              disabled={busy}
              onChange={event => {
                setManagerLastName(event.target.value);
                setErrors(prev => ({ ...prev, managerLastName: undefined }));
              }}
            />
            {errors.managerLastName ? (
              <span className={styles.error}>{errors.managerLastName}</span>
            ) : null}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>نام مرکز</span>
            <input
              className={styles.input}
              type="text"
              value={centerName}
              placeholder="نام مرکز"
              aria-invalid={Boolean(errors.centerName)}
              disabled={busy}
              onChange={event => {
                setCenterName(event.target.value);
                setErrors(prev => ({ ...prev, centerName: undefined }));
              }}
            />
            {errors.centerName ? (
              <span className={styles.error}>{errors.centerName}</span>
            ) : null}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>شماره تماس</span>
            <input
              className={styles.input}
              type="tel"
              inputMode="numeric"
              dir="ltr"
              value={phone}
              placeholder="09xxxxxxxxx"
              aria-invalid={Boolean(errors.phone)}
              disabled={busy}
              onChange={event => {
                setPhone(event.target.value);
                setErrors(prev => ({ ...prev, phone: undefined }));
              }}
            />
            {errors.phone ? (
              <span className={styles.error}>{errors.phone}</span>
            ) : null}
          </label>
        </div>

        <div className={styles.uploads}>
          <ImagePick
            label="آگهی تأسیس"
            file={establishmentNotice}
            previewUrl={noticePreview}
            error={errors.establishmentNotice}
            disabled={busy}
            onPick={file =>
              pickImage(file, setEstablishmentNotice, "establishmentNotice")
            }
            onClear={() => {
              setEstablishmentNotice(null);
              setErrors(prev => ({
                ...prev,
                establishmentNotice: undefined
              }));
            }}
          />
          <ImagePick
            label="مجوز"
            file={license}
            previewUrl={licensePreview}
            error={errors.license}
            disabled={busy}
            onPick={file => pickImage(file, setLicense, "license")}
            onClear={() => {
              setLicense(null);
              setErrors(prev => ({ ...prev, license: undefined }));
            }}
          />
          <ImagePick
            label="مدارک ثبتی"
            file={registrationDocs}
            previewUrl={docsPreview}
            error={errors.registrationDocs}
            disabled={busy}
            onPick={file =>
              pickImage(file, setRegistrationDocs, "registrationDocs")
            }
            onClear={() => {
              setRegistrationDocs(null);
              setErrors(prev => ({ ...prev, registrationDocs: undefined }));
            }}
          />
        </div>

        <div className={styles.actions}>
          <Button
            className={styles.submitBtn}
            size="extraLarge"
            loading={busy}
            onClick={() => {
              void handleSubmit();
            }}
            label={<div className={styles.submitLabel}>ثبت‌نام</div>}
          />
          <Button
            className={styles.backBtn}
            color="clear"
            disabled={busy}
            onClick={onBack}
            label={<div className={styles.backLabel}>بازگشت به اطلاعات ورود</div>}
          />
        </div>
      </div>
    </div>
  );
}
