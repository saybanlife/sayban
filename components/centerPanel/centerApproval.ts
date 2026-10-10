import { PANEL_ROUTES, resolveApiUrl } from "@/lib/apiRoutes";
import { localizeCenterFactValue } from "../centerPage/centerEnumLocales";

export type CenterApprovalStatus = "pending" | "approved" | "rejected";

export type CenterRegistrationDossier = {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  care_domain: string | null;
  care_domain_fa: string;
  manager_last_name: string;
  registered_center_name: string;
  establishment_notice: string;
  license_number: string;
  registration_docs: string;
  main_image: string;
  banner_image: string;
  images: string[];
  approval_status: CenterApprovalStatus;
  is_active: number;
  account_id: number | null;
  account_is_active: number | null;
  account_email: string;
  created_at?: string;
};

export const APPROVAL_STATUS_LABELS: Record<CenterApprovalStatus, string> = {
  pending: "در انتظار تأیید",
  approved: "تأیید شده",
  rejected: "رد شده"
};

export function normalizeApprovalStatus(value: unknown): CenterApprovalStatus {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (raw === "approved" || raw === "rejected" || raw === "pending") return raw;
  return "pending";
}

export function approvalStatusLabel(value: unknown): string {
  return APPROVAL_STATUS_LABELS[normalizeApprovalStatus(value)];
}

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  result?: T;
};

async function parseJson<T>(res: Response): Promise<ApiEnvelope<T>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    throw new Error(`invalid JSON (${res.status})`);
  }
}

function authHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json"
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Map a raw n8n/DB row into the dossier shape the review page renders. */
export function normalizeRegistrationDossier(
  raw: Record<string, unknown> | null | undefined
): CenterRegistrationDossier | null {
  if (!raw || typeof raw !== "object") return null;
  const id = Number(raw.id);
  if (!Number.isFinite(id) || id <= 0) return null;

  const imagesRaw = raw.images ?? raw.image;
  const images: string[] = [];
  if (Array.isArray(imagesRaw)) {
    for (const item of imagesRaw) {
      if (typeof item === "string" && item.trim()) images.push(item.trim());
      else if (item && typeof item === "object") {
        const url = String(
          (item as { image_url?: string; url?: string }).image_url ||
            (item as { url?: string }).url ||
            ""
        ).trim();
        if (url) images.push(url);
      }
    }
  }

  const careDomain = String(raw.care_domain ?? "").trim() || null;
  const mainImage = String(raw.main_image ?? "").trim();
  const bannerImage = String(raw.banner_image ?? "").trim();
  if (mainImage && !images.includes(mainImage)) images.unshift(mainImage);
  if (bannerImage && !images.includes(bannerImage)) images.push(bannerImage);

  return {
    id,
    name: String(raw.name ?? "").trim(),
    phone: String(raw.phone ?? "").trim(),
    email: String(raw.email ?? raw.account_email ?? "").trim(),
    address: String(raw.address ?? "").trim(),
    city: String(raw.city ?? "").trim(),
    state: String(raw.state ?? "").trim(),
    care_domain: careDomain,
    care_domain_fa: careDomain
      ? localizeCenterFactValue("care_domain", careDomain)
      : "",
    manager_last_name: String(raw.manager_last_name ?? "").trim(),
    registered_center_name: String(raw.registered_center_name ?? "").trim(),
    establishment_notice: String(raw.establishment_notice ?? "").trim(),
    license_number: String(raw.license_number ?? "").trim(),
    registration_docs: String(raw.registration_docs ?? "").trim(),
    main_image: mainImage,
    banner_image: bannerImage,
    images,
    approval_status: normalizeApprovalStatus(raw.approval_status),
    is_active: Number(raw.is_active) === 1 ? 1 : 0,
    account_id:
      raw.account_id == null || raw.account_id === ""
        ? null
        : Number(raw.account_id),
    account_is_active:
      raw.account_is_active == null || raw.account_is_active === ""
        ? null
        : Number(raw.account_is_active) === 1
          ? 1
          : 0,
    account_email: String(raw.account_email ?? raw.email ?? "").trim(),
    created_at: raw.created_at ? String(raw.created_at) : undefined
  };
}

export async function fetchCenterRegistration(
  centerId: string | number,
  token?: string
): Promise<CenterRegistrationDossier> {
  const url = new URL(resolveApiUrl(PANEL_ROUTES.centerRegistration));
  url.searchParams.set("id", String(centerId));
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: authHeaders(token)
  });
  const data = await parseJson<Record<string, unknown>>(res);
  if (!res.ok || !data.success) {
    throw new Error(data.message || `ثبت‌نام مرکز بارگذاری نشد (${res.status})`);
  }
  const dossier = normalizeRegistrationDossier(data.result);
  if (!dossier) throw new Error("اطلاعات مرکز یافت نشد.");
  return dossier;
}

export async function setCenterApprovalStatus(
  centerId: string | number,
  approvalStatus: Exclude<CenterApprovalStatus, "pending">,
  token?: string
): Promise<CenterRegistrationDossier> {
  const res = await fetch(resolveApiUrl(PANEL_ROUTES.centerApproval), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({
      center_id: Number(centerId),
      approval_status: approvalStatus
    })
  });
  const data = await parseJson<Record<string, unknown>>(res);
  if (!res.ok || !data.success) {
    throw new Error(data.message || `به‌روزرسانی وضعیت تأیید ناموفق بود.`);
  }
  const dossier = normalizeRegistrationDossier(data.result);
  if (!dossier) throw new Error("پاسخ تأیید مرکز نامعتبر بود.");
  return dossier;
}
