import type { NextApiRequest, NextApiResponse } from "next";

import { resolveApiUrl, PUBLIC_ROUTES } from "@/lib/apiRoutes";
import { getReservationDetailsEnriched } from "@/lib/server/reservationVisitPostVisitService";

function authHeader(req: NextApiRequest) {
  const value = req.headers.authorization;
  return typeof value === "string" ? value : "";
}

function resultList(payload: any) {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.result) ? payload.result : [];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const reservationId = Number(req.query.id);
  if (!Number.isInteger(reservationId) || reservationId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid reservation id" });
  }

  const auth = authHeader(req);
  if (!auth) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const upstream = await fetch(resolveApiUrl(PUBLIC_ROUTES.reservation), {
    headers: { Authorization: auth, Accept: "application/json" },
    cache: "no-store"
  });
  if (!upstream.ok) {
    return res.status(404).json({ success: false, message: "Reservation not found" });
  }
  const payload = await upstream.json().catch(() => null);
  const authorized = resultList(payload).find(
    (item: any) => Number(item?.id) === reservationId
  );
  if (!authorized) {
    return res.status(404).json({ success: false, message: "Reservation not found" });
  }
  const userId = Number(authorized.user_id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  try {
    const details = await getReservationDetailsEnriched(reservationId, userId);
    if (!details) {
      return res.status(404).json({ success: false, message: "Reservation not found" });
    }
    return res.status(200).json({
      success: true,
      result: { ...authorized, ...details }
    });
  } catch {
    return res.status(500).json({ success: false, message: "Request failed" });
  }
}
