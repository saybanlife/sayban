import { readCookie } from "../support/supportTypes";
import { resolveApiUrl, PUBLIC_ROUTES } from "../../src/lib/apiRoutes";
import { resolvePublicAuthToken } from "../../src/lib/publicAuthToken";
import {
  normalizeAddressList,
  type UserAddress
} from "../home/currentAddressModel";

export type CompanionRecord = {
  id: number;
  name?: string | null;
  national_code?: string | null;
  mobile?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  relation?: string | null;
  relation_persian?: string | null;
  city?: string | null;
  address?: string | null;
  details?: string | null;
  postal_code?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  is_main_user?: boolean | number | null;
};

export type PatientUpdatePayload = {
  id: number;
  name: string;
  national_code: string;
  mobile?: string | null;
  gender: string;
  marital_status: string;
  relation: string;
  city?: string | null;
  address?: string | null;
  details?: string | null;
  postal_code?: string | null;
  latitude?: string | null;
  longitude?: string | null;
};

export type AddressUpdatePayload = {
  id: number;
  title: string;
  city: string;
  address: string;
  details: string;
  postal_code?: string | null;
  latitude: string;
  longitude: string;
};

const EDIT_PATIENT_KEY = "sayban.editPatient";
const EDIT_ADDRESS_KEY = "sayban.editAddress";

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = resolvePublicAuthToken(readCookie("token"));
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(extra || {})
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function readJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { success: false, message: text.slice(0, 200) };
  }
}

export function normalizeCompanionList(payload: unknown): CompanionRecord[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as CompanionRecord[];
  if (typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as CompanionRecord[];
  }
  return [];
}

export function listCompanions(payload: unknown) {
  return normalizeCompanionList(payload).filter(
    item => !item.is_main_user && Number(item.id) > 0
  );
}

export function listSavedAddresses(payload: unknown) {
  return normalizeAddressList(payload).filter(item => {
    const row = item as UserAddress & { is_main_user?: boolean | number | null };
    return !row.is_main_user && Number(row.id) > 0;
  });
}

export function rememberEditPatient(record: CompanionRecord) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(EDIT_PATIENT_KEY, JSON.stringify(record));
}

export function readEditPatient(): CompanionRecord | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(EDIT_PATIENT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CompanionRecord;
  } catch {
    return null;
  }
}

export function clearEditPatient() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(EDIT_PATIENT_KEY);
}

export function rememberEditAddress(record: UserAddress) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(EDIT_ADDRESS_KEY, JSON.stringify(record));
}

export function readEditAddress(): UserAddress | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(EDIT_ADDRESS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserAddress;
  } catch {
    return null;
  }
}

export function clearEditAddress() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(EDIT_ADDRESS_KEY);
}

async function postJson(path: string, body: Record<string, unknown>) {
  const res = await fetch(resolveApiUrl(path), {
    method: "POST",
    headers: buildHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body)
  });
  const data = await readJson(res);
  return { ok: res.ok, data };
}

export async function updateCompanion(payload: PatientUpdatePayload) {
  return postJson(PUBLIC_ROUTES.updatePatient, payload as unknown as Record<
    string,
    unknown
  >);
}

export async function deleteCompanion(id: number) {
  return postJson(PUBLIC_ROUTES.deletePatient, { id });
}

export async function updateAddress(payload: AddressUpdatePayload) {
  return postJson(PUBLIC_ROUTES.updateAddress, payload as unknown as Record<
    string,
    unknown
  >);
}

export async function deleteAddress(id: number) {
  return postJson(PUBLIC_ROUTES.deleteAddress, { id });
}

export function companionHasAddress(record?: CompanionRecord | null) {
  if (!record) return false;
  return Boolean(
    String(record.city || "").trim() ||
      String(record.address || "").trim() ||
      String(record.latitude || "").trim()
  );
}

export function formatCompanionAddressLine(record?: CompanionRecord | null) {
  if (!record) return "";
  const city = String(record.city || "").trim();
  const line = String(record.address || "").trim();
  const details = String(record.details || "").trim();
  const parts = [city, line, details].filter(Boolean);
  return parts.join("، ");
}
