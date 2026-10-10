import type { NextApiRequest, NextApiResponse } from "next";

import { resolveApiUrl, PUBLIC_ROUTES } from "@/lib/apiRoutes";
import {
  applyReservationAction,
  getReservationDetails,
  RESERVATION_ACTIONS,
  type ReservationAction
} from "@/lib/server/reservationLifecycleService";

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
  return resultList(payload).find((item: any) => Number(item?.id) === reservationId) ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const reservationId = Number(Array.isArray(req.query.id) ? req.query.id[0] : req.query.id);
  if (!Number.isInteger(reservationId) || reservationId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid reservation id" });
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

    if (req.method === "GET") {
      const details = await getReservationDetails(reservationId, userId);
      const result = details ? { ...authorized, ...details } : null;
      return res.status(result ? 200 : 404).json({ success: Boolean(result), result });
    }

    if (req.method === "POST") {
      const action = String(req.body?.action || "") as ReservationAction;
      if (!RESERVATION_ACTIONS.includes(action)) {
        return res.status(400).json({ success: false, message: "Invalid action" });
      }
      const details = await applyReservationAction(reservationId, userId, {
        action,
        interviewAt: req.body?.interviewAt,
        interviewMode: req.body?.interviewMode,
        attended: req.body?.attended,
        decision: req.body?.decision,
        contractSigned: req.body?.contractSigned,
        declineReason: req.body?.declineReason,
        supportRequested: req.body?.supportRequested
      });
      return res.status(200).json({ success: true, result: { ...authorized, ...details } });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    const status = Number((error as any)?.statusCode) || 500;
    console.error("[api/reservations/id]", status, (error as Error)?.message);
    const safeMessage =
      status >= 500 ? "Request failed" : (error as Error)?.message || "Request failed";
    return res.status(status).json({ success: false, message: safeMessage });
  }
}
