/**
 * Shared limits for panel media picks (images + staff video).
 *
 * Panel *images* upload browser → Liom (`uploadPanelImage`); only the CDN URL
 * is sent to Sayban/n8n. Staff video may still ride base64 inside
 * `panel/staffs/update` — see VideoUpload.
 */

// 8 MB raw becomes ~10.7 MB once base64-encoded, inside the verified range.
const DEFAULT_MAX_VIDEO_MB = 8;

function envNumber(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const MAX_VIDEO_UPLOAD_MB = envNumber(
  process.env.NEXT_PUBLIC_MAX_VIDEO_UPLOAD_MB,
  DEFAULT_MAX_VIDEO_MB
);

/**
 * Image formats the app can actually render everywhere it shows uploads
 * (plain `<img>` in panel thumbnails, Swiper slides and the public center page).
 * AVIF/HEIC/TIFF and SVG are deliberately excluded: the first three are not
 * decodable in every browser we support, and SVG would be an XSS vector since
 * uploads are served back as-is.
 */
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
] as const;

export const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

/** `accept` attribute covering both MIME sniffing and extension fallback. */
export const IMAGE_ACCEPT_ATTR =
  "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

const DEFAULT_MAX_IMAGE_MB = 5;

export const MAX_IMAGE_UPLOAD_MB = envNumber(
  process.env.NEXT_PUBLIC_MAX_IMAGE_UPLOAD_MB,
  DEFAULT_MAX_IMAGE_MB
);

/** Base64 expands 3 bytes into 4 characters. */
export const BASE64_OVERHEAD = 4 / 3;

type UploadedFile = {
  name?: string;
  type?: string;
  contents?: string;
  size?: number;
};

/**
 * Original byte size of a file already read by the Upload wrapper. `contents`
 * is base64 without a data-URL prefix, so the raw size is derived from its
 * length (minus any `=` padding).
 */
export function uploadedFileBytes(file: unknown): number {
  const candidate = (file || {}) as UploadedFile;
  if (typeof candidate.size === "number" && candidate.size > 0) {
    return candidate.size;
  }
  const contents = candidate.contents;
  if (typeof contents !== "string" || !contents) return 0;
  const padding = contents.endsWith("==") ? 2 : contents.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((contents.length * 3) / 4) - padding);
}

function toPersianDigits(value: string): string {
  return value.replace(/\d/g, digit =>
    String.fromCharCode(0x06f0 + Number(digit))
  );
}

function formatMb(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return toPersianDigits(mb >= 10 ? String(Math.round(mb)) : mb.toFixed(1));
}

export type ImageDimensionRules = {
  /** Reject anything smaller than this, so slides do not render blurry. */
  minWidth?: number;
  minHeight?: number;
  /** Reject oversized originals that would only be downscaled anyway. */
  maxWidth?: number;
  maxHeight?: number;
  /** Target width/height ratio plus the tolerance allowed around it. */
  aspectRatio?: number;
  aspectRatioTolerance?: number;
  /** Human-readable ratio for the error message, e.g. "۱۶:۹". */
  aspectRatioLabel?: string;
};

export type ImageDimensions = { width: number; height: number };

function hasAllowedImageType(type: string, name: string): boolean {
  if ((ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(type.toLowerCase())) {
    return true;
  }
  const extension = name.split(".").pop()?.toLowerCase() || "";
  return (ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(extension);
}

/**
 * Format and size gate for image uploads. Runs before the (async) dimension
 * check so an obviously wrong file is rejected without decoding it.
 */
export function describeImageRejection(
  file: { name?: string; type?: string; size?: number; contents?: string } | null | undefined,
  maxMb: number = MAX_IMAGE_UPLOAD_MB
): string | undefined {
  if (!file) return "فایلی انتخاب نشده است.";

  const type = String(file.type || "");
  const name = String(file.name || "");
  if (!hasAllowedImageType(type, name)) {
    return "فقط تصویر با فرمت JPG، PNG یا WEBP مجاز است.";
  }

  const bytes = uploadedFileBytes(file);
  const limitBytes = maxMb * 1024 * 1024;
  if (bytes > limitBytes) {
    return `حجم تصویر ${formatMb(bytes)} مگابایت است؛ حداکثر ${toPersianDigits(
      String(maxMb)
    )} مگابایت مجاز است.`;
  }

  return undefined;
}

/** Decodes just enough of the file to read its intrinsic pixel size. */
export function readImageDimensions(file: Blob): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("تصویر قابل خواندن نیست یا فرمت آن پشتیبانی نمی‌شود."));
    };
    img.src = objectUrl;
  });
}

/** Returns a rejection reason when the decoded size breaks the rules. */
export function describeDimensionRejection(
  dimensions: ImageDimensions,
  rules: ImageDimensionRules
): string | undefined {
  const { width, height } = dimensions;
  if (!width || !height) {
    return "ابعاد تصویر قابل تشخیص نیست.";
  }
  if (rules.minWidth && width < rules.minWidth) {
    return `عرض تصویر باید حداقل ${toPersianDigits(String(rules.minWidth))} پیکسل باشد.`;
  }
  if (rules.minHeight && height < rules.minHeight) {
    return `ارتفاع تصویر باید حداقل ${toPersianDigits(String(rules.minHeight))} پیکسل باشد.`;
  }
  if (rules.maxWidth && width > rules.maxWidth) {
    return `عرض تصویر باید حداکثر ${toPersianDigits(String(rules.maxWidth))} پیکسل باشد.`;
  }
  if (rules.maxHeight && height > rules.maxHeight) {
    return `ارتفاع تصویر باید حداکثر ${toPersianDigits(String(rules.maxHeight))} پیکسل باشد.`;
  }
  if (rules.aspectRatio) {
    const tolerance = rules.aspectRatioTolerance ?? 0.1;
    const actual = width / height;
    if (Math.abs(actual - rules.aspectRatio) > tolerance) {
      const label = rules.aspectRatioLabel || String(rules.aspectRatio);
      return `نسبت ابعاد تصویر باید نزدیک به ${label} باشد.`;
    }
  }
  return undefined;
}

export type UploadFilePayload = {
  name: string;
  type: string;
  size: number;
  /** Base64 without a data-URL prefix, matching the antd Upload wrapper. */
  contents: string;
};

/**
 * Encodes a picked `File` the same way the Plasmic antd Upload wrapper does.
 *
 * The panel save endpoints receive JSON, so a raw `File` would serialize to
 * `{}` and silently upload nothing.
 */
export function fileToUploadPayload(file: File): Promise<UploadFilePayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const commaIndex = result.indexOf(",");
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        contents: commaIndex >= 0 ? result.slice(commaIndex + 1) : result
      });
    };
    reader.onerror = () => reject(new Error("خواندن فایل ناموفق بود."));
    reader.readAsDataURL(file);
  });
}

/**
 * Returns a user-facing reason the file cannot be uploaded, or undefined when
 * it is acceptable.
 */
export function describeVideoRejection(file: unknown): string | undefined {
  const candidate = (file || {}) as UploadedFile;
  if (!candidate.type && !candidate.contents) return undefined;

  const type = String(candidate.type || "");
  const name = String(candidate.name || "");
  const looksLikeVideo =
    /^video\//i.test(type) || /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(name);
  if (!looksLikeVideo) {
    return "فقط فایل ویدیویی مجاز است.";
  }

  const bytes = uploadedFileBytes(candidate);
  const limitBytes = MAX_VIDEO_UPLOAD_MB * 1024 * 1024;
  if (bytes > limitBytes) {
    return `حجم ویدیو ${formatMb(bytes)} مگابایت است؛ حداکثر ${toPersianDigits(
      String(MAX_VIDEO_UPLOAD_MB)
    )} مگابایت مجاز است. ویدیوی کوتاه‌تر یا با کیفیت کمتر انتخاب کنید.`;
  }

  return undefined;
}
