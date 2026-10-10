import type { NextApiRequest, NextApiResponse } from "next";
import type {
  SupportListStatusFilter,
  SupportStatus
} from "../../../../../components/support/supportTypes";
import { isMysqlConfigured } from "@/lib/server/mysqlPool";
import { requireSuperAdmin } from "@/lib/server/supportDb";
import * as supportService from "@/lib/server/supportService";
import {
  resolveApiUrl,
  resolvePanelSupportWebhookPath
} from "@/lib/apiRoutes";

async function proxyToN8n(
  req: NextApiRequest,
  res: NextApiResponse,
  internalPath: string
) {
  const webhookPath = resolvePanelSupportWebhookPath(
    internalPath,
    req.method || "GET"
  );
  if (!webhookPath) {
    return res.status(404).json({ success: false, message: "Not found" });
  }

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (key === "path") continue;
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value) && value[0]) query.set(key, value[0]);
  }
  const qs = query.toString();
  const upstreamUrl = `${resolveApiUrl(webhookPath)}${qs ? `?${qs}` : ""}`;
  const auth = req.headers.authorization;
  const upstream = await fetch(upstreamUrl, {
    method: req.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: String(auth) } : {})
    },
    body:
      req.method && req.method !== "GET" && req.method !== "HEAD"
        ? JSON.stringify(req.body ?? {})
        : undefined
  });
  const text = await upstream.text();
  res.status(upstream.status);
  const contentType = upstream.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return res.json(text ? JSON.parse(text) : {});
    } catch {
      return res.send(text);
    }
  }
  if (!text) {
    return res.json({
      success: false,
      message:
        "Support panel webhook returned an empty response. Activate n8n workflows under scripts/n8n/support/."
    });
  }
  return res.send(text);
}

function handleError(res: NextApiResponse, error: unknown) {
  const statusCode =
    typeof error === "object" &&
    error &&
    "statusCode" in error &&
    typeof (error as any).statusCode === "number"
      ? (error as any).statusCode
      : 500;
  const message =
    error instanceof Error ? error.message : "Support panel request failed";
  return res.status(statusCode).json({ success: false, message });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const parts = (req.query.path as string[] | undefined) || [];
  const path = parts.join("/");
  if (!path) {
    return res.status(404).json({ success: false, message: "Not found" });
  }

  // Authorize before any branch: the n8n proxy forwards the caller's token
  // upstream, so checking the role only on the MySQL path would let a
  // center_admin reach the support console whenever MySQL is unconfigured.
  let adminId: number;
  try {
    adminId = requireSuperAdmin(String(req.headers.authorization || "")).adminId;
  } catch (error) {
    return handleError(res, error);
  }

  if (!isMysqlConfigured()) {
    return proxyToN8n(req, res, path);
  }

  try {

    if (path === "conversations" && req.method === "GET") {
      const status = req.query.status as SupportListStatusFilter | undefined;
      const q = typeof req.query.q === "string" ? req.query.q : undefined;
      const result = await supportService.panelListConversations({
        status: status || "all",
        q
      });
      return res.status(200).json({ success: true, result });
    }

    const messagesMatch = path.match(/^conversations\/(\d+)\/messages$/);
    if (messagesMatch && req.method === "GET") {
      const conversationId = Number(messagesMatch[1]);
      const result = await supportService.panelGetMessages(conversationId);
      return res.status(200).json({ success: true, result });
    }

    const replyMatch = path.match(/^conversations\/(\d+)\/reply$/);
    if (replyMatch && req.method === "POST") {
      const conversationId = Number(replyMatch[1]);
      const message = String((req.body as any)?.message || "");
      const result = await supportService.panelReply(
        adminId,
        conversationId,
        message
      );
      return res.status(200).json({ success: true, result });
    }

    const statusMatch = path.match(/^conversations\/(\d+)\/status$/);
    if (statusMatch && req.method === "POST") {
      const conversationId = Number(statusMatch[1]);
      const status = (req.body as any)?.status as SupportStatus;
      const result = await supportService.panelChangeStatus(
        conversationId,
        status
      );
      return res.status(200).json({ success: true, result });
    }

    const closeMatch = path.match(/^conversations\/(\d+)\/close$/);
    if (closeMatch && req.method === "POST") {
      const conversationId = Number(closeMatch[1]);
      const result = await supportService.panelCloseConversation(conversationId);
      return res.status(200).json({ success: true, result });
    }

    if (path === "callbacks" && req.method === "GET") {
      const result = await supportService.panelListCallbackRequests();
      return res.status(200).json({ success: true, result });
    }

    return res.status(404).json({ success: false, message: "Not found" });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Support DB is not configured")
    ) {
      return proxyToN8n(req, res, path);
    }
    return handleError(res, error);
  }
}
