/**
 * Panel images upload directly from the browser to Liom CDN.
 * n8n / Sayban API only receive the returned URL (never the file bytes).
 */
import { PANEL_ROUTES, resolveApiUrl } from "./apiRoutes";

export const LIOM_PANEL_UPLOAD_URL = "https://api.liom.app/upload/panel";
export const LIOM_UPLOAD_PATH = "sayban";

type LiomUploadResponse = {
  status?: boolean;
  result?: string;
  message?: string;
};

export type RegisterPanelUploadInput = {
  url: string;
  originalName?: string;
  mimeType?: string;
  token?: string;
};

function extractLiomUrl(payload: unknown): string {
  const data = payload as LiomUploadResponse;
  const url = typeof data?.result === "string" ? data.result.trim() : "";
  if (data?.status === false || !url) {
    throw new Error(
      (typeof data?.message === "string" && data.message) ||
        "آپلود تصویر به سرویس فایل ناموفق بود."
    );
  }
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("آدرس تصویر نامعتبر است.");
  }
  return url;
}

/** POST multipart/form-data: file ← File, path=sayban. Returns CDN URL. */
export async function uploadFileToLiom(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file, file.name || "image.jpg");
  body.append("path", LIOM_UPLOAD_PATH);

  const res = await fetch(LIOM_PANEL_UPLOAD_URL, {
    method: "POST",
    body
  });
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      res.ok
        ? "پاسخ سرویس آپلود قابل خواندن نیست."
        : `آپلود ناموفق بود (${res.status}).`
    );
  }
  if (!res.ok) {
    const message =
      typeof (data as LiomUploadResponse)?.message === "string"
        ? (data as LiomUploadResponse).message
        : `آپلود ناموفق بود (${res.status}).`;
    throw new Error(message || "آپلود ناموفق بود.");
  }
  return extractLiomUrl(data);
}

/** Persist CDN URL in `panel__uploads` via URL-only webhook (no file bytes). */
export async function registerPanelUploadUrl(
  input: RegisterPanelUploadInput
): Promise<void> {
  const res = await fetch(resolveApiUrl(PANEL_ROUTES.registerUpload), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(input.token ? { Authorization: `Bearer ${input.token}` } : {})
    },
    body: JSON.stringify({
      url: input.url,
      path: LIOM_UPLOAD_PATH,
      original_name: input.originalName || null,
      mime_type: input.mimeType || null
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(
      (typeof data?.message === "string" && data.message) ||
        "ثبت آدرس تصویر ناموفق بود."
    );
  }
}

/**
 * Upload file to Liom, then register the URL in the DB.
 * Returns the CDN URL for use in entity save calls.
 */
export async function uploadPanelImage(
  file: File,
  opts?: { token?: string; register?: boolean }
): Promise<string> {
  const url = await uploadFileToLiom(file);
  if (opts?.register !== false) {
    await registerPanelUploadUrl({
      url,
      originalName: file.name,
      mimeType: file.type,
      token: opts?.token
    });
  }
  return url;
}

export async function uploadPanelImages(
  files: File[],
  opts?: { token?: string; register?: boolean }
): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    urls.push(await uploadPanelImage(file, opts));
  }
  return urls;
}
