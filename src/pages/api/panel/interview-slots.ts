import type { NextApiRequest, NextApiResponse } from "next";

import {
  interviewOptionsToDrafts,
  newSlotDraft,
  type InterviewSlotDraft
} from "../../../../components/reservation/interviewSlots";
import {
  loadNurseInterviewSlotsState,
  saveNurseInterviewSlots
} from "@/lib/server/panelNurseOfferService";
import { isMysqlConfigured } from "@/lib/server/mysqlPool";
import {
  decodeBearerPayload,
  requireCenterAdmin,
  requireUserId
} from "@/lib/server/supportDb";

function authHeader(req: NextApiRequest) {
  const value = req.headers.authorization || req.headers.Authorization;
  return typeof value === "string" ? value : "";
}

function resolveCenterId(auth: string, bodyCenterId?: unknown) {
  const payload = decodeBearerPayload(auth);
  const role = String(payload?.role ?? "");
  const tokenCenter = Number(payload?.center_id ?? payload?.centerId);
  const bodyCenter = Number(bodyCenterId);
  if (role === "super_admin") {
    if (Number.isFinite(bodyCenter) && bodyCenter > 0) return bodyCenter;
    if (Number.isFinite(tokenCenter) && tokenCenter > 0) return tokenCenter;
    return null;
  }
  if (role === "center_admin") {
    if (!Number.isFinite(tokenCenter) || tokenCenter <= 0) return null;
    if (
      Number.isFinite(bodyCenter) &&
      bodyCenter > 0 &&
      bodyCenter !== tokenCenter
    ) {
      return null;
    }
    return tokenCenter;
  }
  return null;
}

function parseSlots(raw: unknown): InterviewSlotDraft[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, index) => {
    const row = (item || {}) as Record<string, unknown>;
    return newSlotDraft({
      id: String(row.id || `slot-${index}`),
      date: String(row.date || ""),
      time: String(row.time || ""),
      durationMinutes:
        row.durationMinutes != null ? Number(row.durationMinutes) : 30
    });
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!isMysqlConfigured()) {
    return res.status(503).json({
      success: false,
      message: "Database is not configured"
    });
  }

  const auth = authHeader(req);
  try {
    requireUserId(auth);
    const role = String(decodeBearerPayload(auth)?.role ?? "");
    if (role === "center_admin") requireCenterAdmin(auth);
    else if (role !== "super_admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const reservationId = Number(
      req.method === "GET" ? req.query.reservationId : req.body?.reservationId
    );
    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid reservation id"
      });
    }

    const centerId = resolveCenterId(
      auth,
      req.method === "GET" ? req.query.centerId : req.body?.centerId
    );
    if (!centerId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (req.method === "GET") {
      const state = await loadNurseInterviewSlotsState({
        reservationId,
        centerId
      });
      if (!state) {
        return res.status(404).json({ success: false, message: "Not found" });
      }
      return res.status(200).json({
        success: true,
        result: {
          ...state,
          drafts: state.interviewOptions.length
            ? interviewOptionsToDrafts(state.interviewOptions)
            : [newSlotDraft()]
        }
      });
    }

    if (req.method === "POST") {
      const slots = parseSlots(req.body?.slots);
      const staffIdRaw = Number(req.body?.staffId);
      const state = await saveNurseInterviewSlots({
        reservationId,
        centerId,
        staffId: Number.isFinite(staffIdRaw) && staffIdRaw > 0 ? staffIdRaw : null,
        slots,
        modes: Array.isArray(req.body?.modes) ? req.body.modes : undefined
      });
      return res.status(200).json({
        success: true,
        result: {
          ...state,
          drafts: state?.interviewOptions?.length
            ? interviewOptionsToDrafts(state.interviewOptions)
            : [newSlotDraft()]
        }
      });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    const status = Number((error as { statusCode?: number })?.statusCode) || 500;
    console.error("[api/panel/interview-slots]", status, (error as Error)?.message);
    return res.status(status).json({
      success: false,
      message:
        status >= 500
          ? "Request failed"
          : (error as Error)?.message || "Request failed"
    });
  }
}
