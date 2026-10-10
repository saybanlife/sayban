import type { NextApiRequest, NextApiResponse } from "next";

import { resolveApiUrl, PUBLIC_ROUTES } from "@/lib/apiRoutes";
import { applyVisitContractFeedback } from "@/lib/server/reservationVisitPostVisitService";

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

  const reservationId = Number(req.body?.reservation_id ?? req.body?.reservationId);
  if (!Number.isInteger(reservationId) || reservationId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid reservation id" });
  }
  if (typeof req.body?.contractSigned !== "boolean") {
    return res.status(400).json({ success: false, message: "contractSigned required" });
  }

  const authorized = await verifyReservationAccess(req, reservationId);
  if (!authorized) {
    return res.status(404).json({ success: false, message: "Reservation not found" });
  }
  const userId = Number(authorized.user_id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  try {
    const details = await applyVisitContractFeedback(reservationId, userId, {
      contractSigned: req.body.contractSigned,
      declineReason:
        req.body?.declineReason != null ? String(req.body.declineReason) : undefined,
      supportRequested: Boolean(req.body?.supportRequested)
    });
    return res.status(200).json({
      success: true,
      result: { ...authorized, ...details }
    });
  } catch (error) {
    const status = Number((error as any)?.statusCode) || 500;
    const message =
      status >= 500 ? "Request failed" : (error as Error)?.message || "Request failed";
    return res.status(status).json({ success: false, message });
  }
}
