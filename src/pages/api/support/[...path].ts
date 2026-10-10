import type { NextApiRequest, NextApiResponse } from "next";
import { isMysqlConfigured } from "@/lib/server/mysqlPool";
import { requireUserId } from "@/lib/server/supportDb";
import * as supportService from "@/lib/server/supportService";
import {
  resolveApiUrl,
  resolveUserSupportWebhookPath,
  parseUserSupportMessagesPath
} from "@/lib/apiRoutes";

async function proxyToN8n(
  req: NextApiRequest,
  res: NextApiResponse,
  internalPath: string
) {
  const webhookPath = resolveUserSupportWebhookPath(
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
        "Support webhook returned an empty response. Activate n8n workflows under scripts/n8n/support/."
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
    error instanceof Error ? error.message : "Support request failed";
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

  if (!isMysqlConfigured()) {
    return proxyToN8n(req, res, path);
  }

  try {
    const auth = String(req.headers.authorization || "");

    if (path === "conversations/create" && req.method === "POST") {
      const { userId } = requireUserId(auth);
      const message = String((req.body as any)?.message || "");
      const result = await supportService.userCreateConversation(userId, message);
      return res.status(200).json({ success: true, result });
    }

    if (path === "conversations" && req.method === "GET") {
      const { userId } = requireUserId(auth);
      const result = await supportService.userListConversations(userId);
      return res.status(200).json({ success: true, result });
    }

    const messagesConversationId = parseUserSupportMessagesPath(path);
    if (messagesConversationId != null && req.method === "GET") {
      const { userId } = requireUserId(auth);
      const result = await supportService.userGetMessages(
        userId,
        messagesConversationId
      );
      return res.status(200).json({ success: true, result });
    }

    if (messagesConversationId != null && req.method === "POST") {
      const { userId } = requireUserId(auth);
      const body = req.body as { message?: string; attachment_url?: string };
      const result = await supportService.userSendMessage(
        userId,
        messagesConversationId,
        String(body?.message || ""),
        body?.attachment_url
      );
      return res.status(200).json({ success: true, result });
    }

    const closeMatch = path.match(/^conversations\/(\d+)\/close$/);
    if (closeMatch && req.method === "POST") {
      const { userId } = requireUserId(auth);
      const conversationId = Number(closeMatch[1]);
      const result = await supportService.userCloseConversation(
        userId,
        conversationId
      );
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
