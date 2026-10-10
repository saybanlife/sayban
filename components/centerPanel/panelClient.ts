/**
 * Shared types/payload helpers for center panel features.
 * HTTP transport lives in usePanelApi (Fragment.apiRequest) — do not add axios here.
 */
import type {
  AmenityLibraryItem,
  CenterFaqPayload,
  CustomAmenityRequestPayload
} from "./panelApi";

export type { AmenityLibraryItem, CenterFaqPayload, CustomAmenityRequestPayload };

export type PanelFaqItem = {
  id: number;
  center_id: number;
  question: string;
  answer: string;
  sort_order?: number;
  is_active?: number | boolean;
};

export type PanelRequestMethod = "GET" | "POST" | "DELETE" | "PUT" | "PATCH";

/** Same optional 5th-arg shape Plasmic uses for authenticated Fragment.apiRequest calls. */
export function panelAuthConfig(token?: string) {
  if (!token) return undefined;
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
}

export function extractPanelResult<T>(data: unknown): T {
  if (data && typeof data === "object" && "result" in data) {
    return (data as { result: T }).result;
  }
  return data as T;
}

export function buildCreateFaqBody(payload: CenterFaqPayload) {
  return {
    center_id: payload.center_id,
    question: payload.question,
    answer: payload.answer,
    ...(payload.sort_order != null ? { sort_order: payload.sort_order } : {}),
    ...(payload.is_active != null ? { is_active: payload.is_active } : {})
  };
}

export function buildUpdateFaqBody(
  payload: Required<Pick<CenterFaqPayload, "id">> &
    Omit<CenterFaqPayload, "center_id">
) {
  return {
    id: payload.id,
    question: payload.question,
    answer: payload.answer,
    ...(payload.sort_order != null ? { sort_order: payload.sort_order } : {}),
    ...(payload.is_active != null ? { is_active: payload.is_active } : {})
  };
}

export function buildCustomAmenityBody(payload: CustomAmenityRequestPayload) {
  return {
    center_id: payload.center_id,
    name: payload.name,
    ...(payload.description != null ? { description: payload.description } : {}),
    ...(payload.requested_by != null
      ? { requested_by: payload.requested_by }
      : {})
  };
}
