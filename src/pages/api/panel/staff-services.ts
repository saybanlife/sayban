import type { NextApiRequest, NextApiResponse } from "next";

import {
  listStaffCatalogServices,
  updateStaffServiceDurationMode
} from "@/lib/server/staffServiceDurationService";
import { normalizeStaffServiceDurationMode } from "../../../../components/nurseRequest/staffServiceDuration";

function authHeader(req: NextApiRequest) {
  const value = req.headers.authorization;
  return typeof value === "string" ? value : "";
}

/** Lightweight panel JWT presence check (same pattern as other panel BFFs). */
function requirePanelAuth(req: NextApiRequest) {
  return Boolean(authHeader(req));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!requirePanelAuth(req)) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    if (req.method === "GET") {
      const category =
        typeof req.query.category === "string" ? req.query.category : null;
      const result = await listStaffCatalogServices({ category });
      return res.status(200).json({ success: true, result });
    }

    if (req.method === "PATCH" || req.method === "POST") {
      const serviceId = Number(req.body?.id ?? req.body?.service_id);
      if (!Number.isInteger(serviceId) || serviceId <= 0) {
        return res.status(400).json({ success: false, message: "Invalid service id" });
      }
      const rawMode = req.body?.duration_mode;
      const durationMode =
        rawMode === null || rawMode === "" || rawMode === "null"
          ? null
          : normalizeStaffServiceDurationMode(rawMode);
      if (
        rawMode != null &&
        rawMode !== "" &&
        rawMode !== "null" &&
        durationMode == null
      ) {
        return res.status(400).json({
          success: false,
          message: "duration_mode must be once or continuous"
        });
      }
      const result = await updateStaffServiceDurationMode(serviceId, durationMode);
      if (!result) {
        return res.status(404).json({ success: false, message: "Service not found" });
      }
      return res.status(200).json({ success: true, result });
    }

    res.setHeader("Allow", "GET, PATCH, POST");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    console.error("[api/panel/staff-services]", (error as Error)?.message);
    return res.status(500).json({ success: false, message: "Request failed" });
  }
}
