import * as React from "react";
import { HTMLElementRefOf, classNames } from "@plasmicapp/react-web";
import type { DefaultImageProfileProps } from "./plasmic/sayban/PlasmicImageProfile";
import {
  IMAGE_ACCEPT_ATTR,
  describeImageRejection,
  readImageDimensions
} from "./uploadLimits";
import { uploadPanelImage } from "@/lib/panelLiomUpload";
import { PANEL_AUTH_COOKIE_NAME, readCookie } from "@/lib/authCookies";
import styles from "./ImageProfile.module.css";

export interface ImageProfileProps extends DefaultImageProfileProps {
  className?: string;
}

/** Last successful Liom URL — used by panel pages to refresh the avatar after save. */
let lastCenterProfileUploadUrl = "";

export function getLastCenterProfileUploadUrl() {
  return lastCenterProfileUploadUrl;
}

export function setLastCenterProfileUploadUrl(url: string) {
  lastCenterProfileUploadUrl = String(url || "").trim();
}

type UploadFile = {
  url?: string;
  name?: string;
  type?: string;
  contents?: string;
};

function previewFromFiles(files: unknown): string {
  if (!Array.isArray(files) || !files.length) return "";
  const first = files[0] as UploadFile | string;
  if (typeof first === "string") return first.trim();
  if (first?.url) return String(first.url).trim();
  if (first?.type && first?.contents) {
    return `data:${first.type};base64,${first.contents}`;
  }
  return "";
}

function ImageProfile_(
  props: ImageProfileProps,
  ref: HTMLElementRefOf<"div">
) {
  const { uploadFiles, onUploadFilesChange, className } = props;
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [localPreview, setLocalPreview] = React.useState("");

  const preview = localPreview || previewFromFiles(uploadFiles);

  const emitFiles = React.useCallback(
    (files: UploadFile[]) => {
      onUploadFilesChange?.(files);
    },
    [onUploadFilesChange]
  );

  const clear = React.useCallback(() => {
    setLocalPreview("");
    setError("");
    setLastCenterProfileUploadUrl("");
    emitFiles([]);
    if (inputRef.current) inputRef.current.value = "";
  }, [emitFiles]);

  const onPick = async (file: File | null) => {
    if (!file || busy) return;
    setError("");
    const basic = describeImageRejection(file);
    if (basic) {
      setError(basic);
      return;
    }
    try {
      await readImageDimensions(file);
    } catch {
      setError("تصویر قابل خواندن نیست یا فرمت آن پشتیبانی نمی‌شود.");
      return;
    }

    setBusy(true);
    try {
      const objectUrl = URL.createObjectURL(file);
      setLocalPreview(objectUrl);
      const token = readCookie(PANEL_AUTH_COOKIE_NAME) || undefined;
      const url = await uploadPanelImage(file, { token });
      URL.revokeObjectURL(objectUrl);
      setLocalPreview(url);
      setLastCenterProfileUploadUrl(url);
      emitFiles([{ url, name: file.name, type: file.type }]);
    } catch (err) {
      setLocalPreview("");
      setLastCenterProfileUploadUrl("");
      emitFiles([]);
      setError(err instanceof Error ? err.message : "آپلود تصویر ناموفق بود.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div
      ref={ref}
      className={classNames(styles.root, className)}
      data-busy={busy ? "true" : "false"}
    >
      <input
        ref={inputRef}
        className={styles.hiddenInput}
        type="file"
        accept={IMAGE_ACCEPT_ATTR}
        disabled={busy}
        onChange={e => void onPick(e.target.files?.[0] ?? null)}
      />

      {preview ? (
        <div className={styles.previewWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.preview} src={preview} alt="پیش‌نمایش پروفایل" />
          <button
            type="button"
            className={styles.clearBtn}
            onClick={clear}
            disabled={busy}
            aria-label="حذف تصویر"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={styles.dropzone}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <span className={styles.dropTitle}>
            {busy ? "در حال آپلود..." : "فایل را بکشید و رها کنید یا انتخاب کنید"}
          </span>
          <span className={styles.dropAction}>{busy ? "..." : "انتخاب تصویر"}</span>
        </button>
      )}

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}

const ImageProfile = React.forwardRef(ImageProfile_);
export default ImageProfile;
