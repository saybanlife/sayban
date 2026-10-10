import { PANEL_ROUTES, resolveApiUrl } from "@/lib/apiRoutes";
import { readCookie } from "../support/supportTypes";

/**
 * A center review as returned by the `panel/reviews` webhooks. The reply fields
 * are projected from the `centers__reply` table, which is also what the public
 * center page renders.
 */
export type PanelCenterReview = {
  id: number;
  center_id: number;
  user_id: number | null;
  rating: number | null;
  comment: string | null;
  created_at: string | null;
  admin_reply: string | null;
  admin_replied_at: string | null;
  admin_replied_by: number | null;
  user_name: string | null;
  user_mobile: string | null;
  has_reply: boolean;
};

type ApiResult<T> = {
  ok: boolean;
  data: T & { success?: boolean; message?: string; result?: unknown };
};

async function panelRequest<T = Record<string, unknown>>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  tokenOverride?: string
): Promise<ApiResult<T>> {
  const token =
    tokenOverride ||
    readCookie("panelToken") ||
    readCookie("token");
  const res = await fetch(resolveApiUrl(path), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    success?: boolean;
    message?: string;
    result?: unknown;
  };
  return { ok: res.ok, data };
}

/**
 * Server messages are developer-facing English (missing env vars, stack-level
 * failures). Only surface them when they are already localized.
 */
export function panelReviewsErrorMessage(
  message: string | undefined,
  fallback: string
): string {
  const trimmed = (message || "").trim();
  if (!trimmed) return fallback;
  return /[\u0600-\u06FF]/.test(trimmed) ? trimmed : fallback;
}

export async function panelListCenterReviews(
  token: string | undefined,
  opts?: { q?: string; replied?: "all" | "yes" | "no" }
) {
  const query = new URLSearchParams();
  if (opts?.q) query.set("q", opts.q);
  if (opts?.replied && opts.replied !== "all") query.set("replied", opts.replied);
  const qs = query.toString();
  return panelRequest<{ result?: PanelCenterReview[]; center_id?: number }>(
    "GET",
    qs ? `${PANEL_ROUTES.reviews}?${qs}` : PANEL_ROUTES.reviews,
    undefined,
    token
  );
}

export async function panelReplyCenterReview(
  token: string | undefined,
  reviewId: number,
  reply: string
) {
  return panelRequest<{ result?: PanelCenterReview }>(
    "POST",
    PANEL_ROUTES.reviewsReply,
    { review_id: reviewId, comment: reply.trim() },
    token
  );
}

export async function panelClearCenterReviewReply(
  token: string | undefined,
  reviewId: number
) {
  return panelRequest<{ result?: PanelCenterReview }>(
    "POST",
    PANEL_ROUTES.reviewsClearReply,
    { review_id: reviewId },
    token
  );
}

export async function panelDeleteCenterReview(
  token: string | undefined,
  reviewId: number
) {
  return panelRequest<{ deleted_id?: number }>(
    "POST",
    PANEL_ROUTES.reviewsDelete,
    { review_id: reviewId },
    token
  );
}
