import type { NextApiRequest, NextApiResponse } from "next";

import { resolveApiUrl, PUBLIC_ROUTES } from "@/lib/apiRoutes";
import { submitReservationCenterReview } from "@/lib/server/reservationCenterReviewService";

function authHeader(req: NextApiRequest) {
  const value = req.headers.authorization;
  return typeof value === "string" ? value : "";
}

function resultList(payload: any) {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.result) ? payload.result : [];
}

async function verifyReservationAccess(req: NextApiRequest, reservationId: number) {
  const auth = authHeader(req);
  if (!auth) return null;
  const upstream = await fetch(resolveApiUrl(PUBLIC_ROUTES.reservation), {
    headers: { Authorization: auth, Accept: "application/json" },
    cache: "no-store"
  });
  if (!upstream.ok) return null;
  const payload = await upstream.json().catch(() => null);
  return (
    resultList(payload).find((item: any) => Number(item?.id) === reservationId) ??
    null
  );
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const reservationId = Number(Array.isArray(req.query.id) ? req.query.id[0] : req.query.id);
  const centerId = Number(req.body?.center_id);
  const rate = Number(req.body?.rate);

  if (!Number.isInteger(reservationId) || reservationId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid reservation id" });
  }
  if (!Number.isInteger(centerId) || centerId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid center id" });
  }
  if (!Number.isFinite(rate) || rate < 1 || rate > 5) {
    return res.status(400).json({ success: false, message: "Invalid rating" });
  }

  const auth = authHeader(req);
  if (!auth) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const authorized = await verifyReservationAccess(req, reservationId);
    if (!authorized) {
      return res.status(404).json({ success: false, message: "Reservation not found" });
    }
    const userId = Number(authorized.user_id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const result = await submitReservationCenterReview({
      reservationId,
      userId,
      authHeader: auth,
      centerId,
      rate: Math.floor(rate),
      comment: String(req.body?.comment ?? ""),
      privateComment: String(req.body?.private_comment ?? ""),
      contractSigned:
        typeof req.body?.contract_signed === "boolean"
          ? req.body.contract_signed
          : undefined,
      declineReason:
        req.body?.decline_reason != null
          ? String(req.body.decline_reason)
          : null,
      supportRequested: Boolean(req.body?.support_requested)
    });
    return res.status(200).json({ success: true, result });
  } catch (error) {
    const status = Number((error as any)?.statusCode) || 500;
    const message =
      status >= 500 ? "Request failed" : (error as Error)?.message || "Request failed";
    return res.status(status).json({ success: false, message });
  }
}
