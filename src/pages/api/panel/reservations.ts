import type { NextApiRequest, NextApiResponse } from "next";
import { resolveApiUrl } from "@/lib/apiRoutes";
import { decodeBearerPayload } from "@/lib/server/supportDb";
import { sanitizePanelReservationsResponse } from "../../../../components/reservations/sanitizePanelReservation";

function authHeader(req: NextApiRequest) {
  const h = req.headers.authorization || req.headers.Authorization;
  return typeof h === "string" ? h : "";
}

function viewerFromAuth(auth: string) {
  const payload = decodeBearerPayload(auth);
  const centerRaw = payload?.center_id ?? payload?.centerId;
  const centerId = Number(centerRaw);
  return {
    role: payload ? String(payload.role ?? "") : "",
    centerId: Number.isFinite(centerId) && centerId > 0 ? centerId : null
  };
}

/**
 * Panel reservations proxy. Companion (patient) details come from the n8n
 * `/panel/reservations` workflow JOIN chain (users + users__patient).
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const auth = authHeader(req);
  const upstream = resolveApiUrl("/panel/reservations");
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query)) {
    if (typeof v === "string") qs.set(k, v);
  }
  const url = qs.toString() ? `${upstream}?${qs}` : upstream;

  try {
    const upstreamRes = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(auth ? { Authorization: auth } : {})
      }
    });
    const data = await upstreamRes.json().catch(() => ({}));
    return res
      .status(upstreamRes.status)
      .json(sanitizePanelReservationsResponse(data, viewerFromAuth(auth)));
  } catch (error) {
    console.error("[api/panel/reservations]", error);
    return res.status(502).json({
      success: false,
      message: "Failed to load reservations"
    });
  }
}
