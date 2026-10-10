import type { NextApiRequest, NextApiResponse } from "next";
import { resolveApiUrl, PUBLIC_ROUTES } from "@/lib/apiRoutes";

/**
 * Same-origin compatibility shim for clients that still call
 * `/api/address/current`. The selected address lives in
 * `users__addresses.is_current` and is owned by the n8n `address/current`
 * webhooks, so this only forwards the request and its Authorization header.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const method = (req.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "POST" && method !== "PUT") {
    res.setHeader("Allow", "GET, POST, PUT");
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  const auth = req.headers.authorization;
  const upstreamUrl = resolveApiUrl(PUBLIC_ROUTES.addressCurrent);

  try {
    const upstream = await fetch(upstreamUrl, {
      // The webhook exposes the setter over POST only.
      method: method === "GET" ? "GET" : "POST",
      headers: {
        Accept: "application/json",
        ...(method === "GET" ? {} : { "Content-Type": "application/json" }),
        ...(auth ? { Authorization: String(auth) } : {})
      },
      body: method === "GET" ? undefined : JSON.stringify(req.body ?? {})
    });

    const text = await upstream.text();
    res.status(upstream.status);
    try {
      return res.json(text ? JSON.parse(text) : {});
    } catch {
      return res.send(text);
    }
  } catch (error) {
    return res.status(502).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to reach upstream address/current webhook"
    });
  }
}
