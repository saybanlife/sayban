import type { NextApiRequest, NextApiResponse } from "next";

import {
  estimateNurseRequestPrice,
  estimateDisplayRange,
  PLATFORM_NURSE_PRICING_DEFAULTS,
  type PriceEstimateContext
} from "@/lib/nurseRequest/priceEstimateModel";
import { isMysqlConfigured } from "@/lib/server/mysqlPool";
import { estimatePriceForRequest } from "@/lib/server/nursePricingService";

function readContext(body: Record<string, unknown>): PriceEstimateContext {
  const duration =
    body.duration === "continuous" || body.duration === "once"
      ? body.duration
      : null;
  const role =
    body.role === "caregiver" ||
    body.role === "nurse" ||
    body.role === "unsure" ||
    body.role === "any"
      ? body.role
      : null;
  const answers =
    body.answers && typeof body.answers === "object"
      ? (body.answers as Record<string, string>)
      : {};
  const serviceLabels = Array.isArray(body.serviceLabels)
    ? body.serviceLabels.map(item => String(item))
    : [];
  const shiftHours =
    body.shiftHours == null || body.shiftHours === ""
      ? null
      : Number(body.shiftHours);

  return {
    duration,
    role: role === "any" ? "unsure" : role,
    answers,
    serviceLabels,
    shiftHours: Number.isFinite(shiftHours as number)
      ? (shiftHours as number)
      : null
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const raw =
    req.method === "GET"
      ? (req.query as Record<string, unknown>)
      : ((req.body || {}) as Record<string, unknown>);

  let answers = raw.answers;
  if (typeof answers === "string") {
    try {
      answers = JSON.parse(answers);
    } catch {
      answers = {};
    }
  }
  let serviceLabels = raw.serviceLabels;
  if (typeof serviceLabels === "string") {
    try {
      serviceLabels = JSON.parse(serviceLabels);
    } catch {
      serviceLabels = String(serviceLabels)
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);
    }
  }

  const ctx = readContext({ ...raw, answers, serviceLabels });
  const centerId =
    raw.centerId != null && String(raw.centerId).trim()
      ? Number(raw.centerId)
      : null;

  let estimate = null;
  if (isMysqlConfigured()) {
    estimate = await estimatePriceForRequest(
      ctx,
      Number.isFinite(centerId as number) ? centerId : null
    );
  } else {
    estimate = estimateNurseRequestPrice(
      ctx,
      PLATFORM_NURSE_PRICING_DEFAULTS,
      "platform"
    );
  }

  if (!estimate) {
    return res.status(200).json({
      success: true,
      result: null,
      message: "برآورد قیمت برای این درخواست در دسترس نیست."
    });
  }

  return res.status(200).json({
    success: true,
    result: {
      ...estimate,
      displayRange: estimateDisplayRange(estimate)
    }
  });
}
