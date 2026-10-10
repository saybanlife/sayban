import type { NextApiRequest, NextApiResponse } from "next";

import type { NursePricingRule } from "@/lib/nurseRequest/priceEstimateModel";
import { isMysqlConfigured } from "@/lib/server/mysqlPool";
import {
  deleteCenterNursePricingRule,
  listCenterNursePricingForAdmin,
  upsertCenterNursePricingRule
} from "@/lib/server/nursePricingService";
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

function parseRule(raw: Record<string, unknown>): Omit<
  NursePricingRule,
  "center_id"
> {
  return {
    id: raw.id != null ? Number(raw.id) : undefined,
    duration_mode: raw.duration_mode === "continuous" ? "continuous" : "once",
    role_mode:
      raw.role_mode === "caregiver" || raw.role_mode === "nurse"
        ? raw.role_mode
        : "any",
    base_min: Number(raw.base_min) || 0,
    base_max: Number(raw.base_max) || 0,
    currency_label: String(raw.currency_label || "تومان"),
    price_period: raw.price_period === "monthly" ? "monthly" : "service",
    factors: Array.isArray(raw.factors) ? raw.factors : [],
    note_template:
      raw.note_template == null ? null : String(raw.note_template),
    is_active: raw.is_active == null ? true : Boolean(raw.is_active)
  };
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

    const centerId = resolveCenterId(
      auth,
      req.method === "GET" ? req.query.centerId : req.body?.centerId
    );
    if (!centerId) {
      return res.status(400).json({ success: false, message: "Invalid center" });
    }

    if (req.method === "GET") {
      const result = await listCenterNursePricingForAdmin(centerId);
      return res.status(200).json({ success: true, result });
    }

    if (req.method === "POST" || req.method === "PUT") {
      const rule = parseRule((req.body || {}) as Record<string, unknown>);
      if (rule.base_min <= 0 || rule.base_max < rule.base_min) {
        return res.status(400).json({
          success: false,
          message: "بازه قیمت نامعتبر است."
        });
      }
      const id = await upsertCenterNursePricingRule(centerId, rule);
      const result = await listCenterNursePricingForAdmin(centerId);
      return res.status(200).json({ success: true, result, id });
    }

    if (req.method === "DELETE") {
      const ruleId = Number(req.body?.id ?? req.query.id);
      if (!Number.isFinite(ruleId) || ruleId <= 0) {
        return res.status(400).json({ success: false, message: "Invalid id" });
      }
      const ok = await deleteCenterNursePricingRule(centerId, ruleId);
      if (!ok) {
        return res.status(404).json({ success: false, message: "Not found" });
      }
      const result = await listCenterNursePricingForAdmin(centerId);
      return res.status(200).json({ success: true, result });
    }

    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    const status = Number((error as { statusCode?: number })?.statusCode) || 500;
    return res.status(status).json({
      success: false,
      message: (error as Error)?.message || "Request failed"
    });
  }
}
