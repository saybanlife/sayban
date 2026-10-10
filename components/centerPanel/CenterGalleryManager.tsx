import * as React from "react";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import { panelAuthConfig } from "./panelClient";
import { usePanelApi } from "./usePanelApi";
import { PANEL_ROUTES } from "@/lib/apiRoutes";
import { uploadPanelImages } from "@/lib/panelLiomUpload";
import {
  IMAGE_ACCEPT_ATTR,
  MAX_IMAGE_UPLOAD_MB,
  describeDimensionRejection,
  describeImageRejection,
  readImageDimensions
} from "../uploadLimits";
import styles from "./CenterGalleryManager.module.css";

/** Keeps thumbnails and the public gallery from rendering unusably small images. */
const GALLERY_DIMENSION_RULES = { minWidth: 640, minHeight: 480 };

type CenterImage = {
  id?: number | string;
  image_url?: string;
  url?: string;
};

type CenterGalleryManagerProps = {
  centerId?: string | number;
  token?: string;
  onChanged?: () => void;
};

function imageSrc(img: CenterImage) {
  return String(img.image_url || img.url || "").trim();
}

export function CenterGalleryManager({
  centerId,
  token,
  onChanged
}: CenterGalleryManagerProps) {
  const api = usePanelApi(token);
  const globalActions = useGlobalActions();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [images, setImages] = React.useState<CenterImage[]>([]);
  const [mainImage, setMainImage] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  /** How many placeholder loading boxes to show during an in-flight upload. */
  const [uploadingSlots, setUploadingSlots] = React.useState(0);

  const load = React.useCallback(async () => {
    if (!centerId) return;
    setLoading(true);
    try {
      const result = await api.fetchCenterFacts(centerId);
      const list = Array.isArray(result?.image)
        ? (result.image as CenterImage[])
        : [];
      setImages(list.filter(img => imageSrc(img)));
      setMainImage(String(result?.main_image || "").trim());
    } finally {
      setLoading(false);
    }
  }, [api, centerId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const request = React.useCallback(
    async (
      method: "GET" | "POST",
      url: string,
      body?: Record<string, unknown>
    ) => {
      const fn = globalActions?.["Fragment.apiRequest"] as
        | ((
            method: string,
            url: string,
            params?: unknown,
            body?: unknown,
            config?: unknown
          ) => Promise<{ data?: { success?: boolean; message?: string } }>)
        | undefined;
      if (!fn) return undefined;
      return fn(method, url, undefined, body, panelAuthConfig(token));
    },
    [globalActions, token]
  );

  const toast = (type: "success" | "error", message: string) => {
    globalActions?.["Fragment.showToast"]?.(type, message, "top-center");
  };

  /** Rejects a file on format, size or pixel dimensions before encoding it. */
  const rejectionFor = async (file: File): Promise<string | undefined> => {
    const basic = describeImageRejection(file);
    if (basic) return basic;
    try {
      const dimensions = await readImageDimensions(file);
      return describeDimensionRejection(dimensions, GALLERY_DIMENSION_RULES);
    } catch (error) {
      return error instanceof Error ? error.message : "تصویر قابل خواندن نیست.";
    }
  };

  const handleUpload = async (selected: FileList | null) => {
    const files = Array.from(selected || []);
    if (!centerId || !files.length || busy) return;

    setBusy(true);
    setUploadingSlots(files.length);
    try {
      const accepted: File[] = [];
      const rejected: string[] = [];

      for (const file of files) {
        const reason = await rejectionFor(file);
        if (reason) {
          rejected.push(`${file.name}: ${reason}`);
          continue;
        }
        accepted.push(file);
      }

      if (rejected.length) {
        toast("error", rejected.join("\n"));
      }
      if (!accepted.length) return;

      setUploadingSlots(accepted.length);
      const urls = await uploadPanelImages(accepted, { token });
      const res = await request("POST", PANEL_ROUTES.addImage, {
        images: urls.map(url => ({ url })),
        center_id: centerId
      });
      if (res?.data?.success) {
        toast(
          "success",
          accepted.length > 1
            ? `${accepted.length} تصویر اضافه شد.`
            : "تصویر اضافه شد."
        );
        // Keep gallery boxes in loading until refresh finishes (no page-level loader).
        await load();
        onChanged?.();
      } else {
        toast("error", res?.data?.message || "آپلود تصویر ناموفق بود.");
      }
    } catch (error) {
      toast(
        "error",
        error instanceof Error ? error.message : "آپلود تصویر ناموفق بود."
      );
    } finally {
      setBusy(false);
      setUploadingSlots(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (img: CenterImage) => {
    if (!img.id || busy) return;
    setBusy(true);
    try {
      const res = await request("POST", "/delete/image", { id: img.id });
      if (res?.data?.success) {
        toast("success", "تصویر حذف شد.");
        await load();
        onChanged?.();
      } else {
        toast("error", res?.data?.message || "حذف تصویر ناموفق بود.");
      }
    } finally {
      setBusy(false);
    }
  };

  const ordered = React.useMemo(() => {
    if (!mainImage) return images;
    const mainIdx = images.findIndex(img => imageSrc(img) === mainImage);
    if (mainIdx <= 0) return images;
    const copy = [...images];
    const [main] = copy.splice(mainIdx, 1);
    return [main, ...copy];
  }, [images, mainImage]);

  if (!centerId) return null;

  const isUploading = busy && uploadingSlots > 0;

  return (
    <div className={styles.wrap} aria-busy={isUploading || undefined}>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={IMAGE_ACCEPT_ATTR}
        className={styles.hiddenInput}
        disabled={busy}
        onChange={e => handleUpload(e.target.files)}
      />
      <div className={styles.row} role="list">
        <button
          type="button"
          className={`${styles.addCard}${
            isUploading ? ` ${styles.addCardBusy}` : ""
          }`}
          onClick={() => fileRef.current?.click()}
          disabled={busy || loading}
          aria-label={isUploading ? "در حال آپلود تصویر" : "افزودن تصویر"}
          aria-busy={isUploading || undefined}
        >
          {isUploading ? (
            <>
              <span className={styles.spinner} aria-hidden />
              <span className={styles.addTitle}>در حال آپلود…</span>
              <span className={styles.addHint}>لطفاً صبر کنید</span>
            </>
          ) : (
            <>
              <span className={styles.addPlus}>+</span>
              <span className={styles.addTitle}>افزودن تصویر</span>
              <span className={styles.addHint}>
                چند فایل هم‌زمان · حداکثر {MAX_IMAGE_UPLOAD_MB}MB · JPG، PNG،
                WEBP
              </span>
            </>
          )}
        </button>

        {isUploading
          ? Array.from({ length: uploadingSlots }, (_, i) => (
              <div
                key={`uploading-${i}`}
                className={styles.thumb}
                role="listitem"
                aria-busy="true"
                aria-label="در حال آپلود"
              >
                <div className={`${styles.thumbFrame} ${styles.thumbLoading}`}>
                  <span className={styles.spinner} aria-hidden />
                  <span className={styles.thumbLoadingLabel}>آپلود…</span>
                </div>
                <div className={styles.caption}>در حال آپلود</div>
              </div>
            ))
          : null}

        {loading && !isUploading && !ordered.length ? (
          <div className={styles.empty}>در حال بارگذاری…</div>
        ) : null}

        {ordered.map((img, index) => {
          const src = imageSrc(img);
          const isMain = index === 0 || src === mainImage;
          return (
            <div
              key={String(img.id || src)}
              className={`${styles.thumb}${
                isUploading ? ` ${styles.thumbDimmed}` : ""
              }`}
              role="listitem"
            >
              <div className={styles.thumbFrame}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className={styles.thumbImg} />
                {isUploading ? (
                  <div className={styles.thumbBusyOverlay} aria-hidden>
                    <span className={styles.spinner} />
                  </div>
                ) : null}
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(img)}
                  disabled={busy}
                  aria-label="حذف تصویر"
                >
                  ×
                </button>
              </div>
              <div
                className={`${styles.caption}${
                  isMain ? ` ${styles.captionMain}` : ""
                }`}
              >
                {isMain ? "تصویر اصلی" : `تصویر ${index + 1}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CenterGalleryManager;
