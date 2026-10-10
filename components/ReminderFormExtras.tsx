import * as React from "react";
import {
  IMAGE_ACCEPT_ATTR,
  describeImageRejection
} from "./uploadLimits";
import { uploadFileToLiom } from "@/lib/panelLiomUpload";
import styles from "./ReminderFormExtras.module.css";

export type ReminderCompanion = {
  id: number;
  name: string;
  relation?: string | null;
  relation_persian?: string | null;
};

export type ReminderFormExtrasValue = {
  patientId: number | null;
  imageUrl: string | null;
};

type Props = {
  companions: ReminderCompanion[];
  value: ReminderFormExtrasValue;
  onChange: (next: ReminderFormExtrasValue) => void;
  disabled?: boolean;
};

function companionLabel(c: ReminderCompanion): string {
  const rel = String(c.relation_persian || c.relation || "").trim();
  return rel ? `${c.name} (${rel})` : c.name;
}

/**
 * Companion + image fields styled like ReminderSetting title rows
 * (label + control, same tokens as «عنوان»).
 */
export default function ReminderFormExtras({
  companions,
  value,
  onChange,
  disabled
}: Props) {
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onPickFile = React.useCallback(
    async (file: File | null) => {
      setError(null);
      if (!file) return;
      const reject = describeImageRejection(file);
      if (reject) {
        setError(reject);
        return;
      }
      setUploading(true);
      try {
        const url = await uploadFileToLiom(file);
        onChange({ ...value, imageUrl: url });
      } catch (e) {
        setError(e instanceof Error ? e.message : "آپلود تصویر ناموفق بود.");
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [onChange, value]
  );

  return (
    <div className={styles.root} data-reminder-form-extras="1" dir="rtl">
      <div className={styles.field}>
        <div className={styles.fieldLabel}>همراه</div>
        <select
          id="reminder-companion"
          className={styles.fieldControl}
          disabled={disabled || uploading}
          value={value.patientId != null ? String(value.patientId) : ""}
          onChange={e => {
            const raw = e.target.value;
            const id = raw ? Number(raw) : null;
            onChange({
              ...value,
              patientId:
                id != null && Number.isFinite(id) && id > 0 ? id : null
            });
          }}
          aria-label="همراه"
        >
          <option value="">خودم</option>
          {companions.map(c => (
            <option key={c.id} value={String(c.id)}>
              {companionLabel(c)}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <div className={styles.fieldLabel}>تصویر یادآوری</div>
        <div className={styles.imageRow}>
          <button
            type="button"
            className={styles.addChip}
            disabled={disabled || uploading}
            onClick={() => fileRef.current?.click()}
          >
            <span className={styles.addPlus} aria-hidden>
              +
            </span>
            {uploading
              ? "در حال آپلود…"
              : value.imageUrl
                ? "تغییر تصویر"
                : "افزودن"}
          </button>
          {value.imageUrl ? (
            <button
              type="button"
              className={styles.removeChip}
              disabled={disabled || uploading}
              onClick={() => onChange({ ...value, imageUrl: null })}
            >
              حذف
            </button>
          ) : null}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_ACCEPT_ATTR}
          className={styles.file}
          disabled={disabled || uploading}
          onChange={e => {
            void onPickFile(e.target.files?.[0] || null);
          }}
        />
        {value.imageUrl ? (
          <div className={styles.previewWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.imageUrl}
              alt=""
              className={styles.preview}
            />
          </div>
        ) : null}
        {error ? <div className={styles.error}>{error}</div> : null}
      </div>
    </div>
  );
}
