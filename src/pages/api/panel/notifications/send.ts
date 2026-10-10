import type { NextApiRequest, NextApiResponse } from "next";
import { PANEL_ROUTES, resolveApiUrl } from "@/lib/apiRoutes";
import { requireSuperAdmin } from "@/lib/server/supportDb";

const NOTIFICATION_TYPES = new Set([
  "system",
  "order_approved",
  "order_rejected",
  "reminder",
  "promotion",
  "other"
]);

type AudienceMode = "all" | "users" | "panel" | "panel_users";

function parseIds(raw: unknown): number[] {
  if (Array.isArray(raw)) {
    return raw.map(Number).filter(id => Number.isFinite(id) && id > 0);
  }
  if (typeof raw === "string") {
    return raw
      .split(/[\s,،;]+/)
      .map(part => Number(part.trim()))
      .filter(id => Number.isFinite(id) && id > 0);
  }
  if (raw != null && raw !== "") {
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? [id] : [];
  }
  return [];
}

function handleError(res: NextApiResponse, error: unknown) {
  const statusCode =
    typeof error === "object" &&
    error &&
    "statusCode" in error &&
    typeof (error as { statusCode?: number }).statusCode === "number"
      ? (error as { statusCode: number }).statusCode
      : 500;
  const message =
    error instanceof Error ? error.message : "ارسال اعلان ناموفق بود";
  return res.status(statusCode).json({ success: false, message });
}

async function savePanelInboxRows(opts: {
  authHeader: string;
  title: string;
  text: string;
  action: string;
  notificationType: string;
  panelUserIds: number[];
  audience: AudienceMode;
}) {
  const upstream = await fetch(resolveApiUrl(PANEL_ROUTES.sendNotifPanel), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: opts.authHeader
    },
    body: JSON.stringify({
      title: opts.title,
      text: opts.text,
      action: opts.action,
      notification_type: opts.notificationType,
      audience: opts.audience,
      panelUserIds: opts.panelUserIds,
      userIds: opts.panelUserIds,
      isSendNow: true,
      isSaveData: true,
      sentAt: new Date().toISOString()
    })
  });
  const json = await upstream.json().catch(() => ({}));
  if (!upstream.ok || (json as { success?: boolean })?.success === false) {
    throw Object.assign(
      new Error(
        (json as { message?: string })?.message ||
          "ذخیره اعلان پنل ناموفق بود."
      ),
      { statusCode: 502 }
    );
  }
  return json;
}

/**
 * Legacy BFF kept for older clients. Prefer webhook routes:
 * - `send-notif` (app users)
 * - `send-notif-panel` (panel staff)
 * via `PANEL_ROUTES` + `resolveApiUrl` / `API_BASE_URL`.
 *
 * Super Admin panel notifications:
 * - audience users/all → n8n `send-notif` (+ users__notification)
 * - audience panel/panel_users → n8n `send-notif-panel` (+ panel__notification)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    requireSuperAdmin(req.headers.authorization);
    const authHeader = String(req.headers.authorization || "");

    const body = (req.body || {}) as Record<string, unknown>;
    const title = String(body.title ?? "").trim();
    const text = String(body.text ?? "").trim();
    const action = String(body.action ?? "/").trim() || "/";
    const notificationTypeRaw = String(
      body.notification_type ?? "system"
    ).trim();
    const notificationType = NOTIFICATION_TYPES.has(notificationTypeRaw)
      ? notificationTypeRaw
      : "system";

    const audienceRaw = String(body.audience ?? "").trim();
    let audience: AudienceMode = "all";
    if (audienceRaw === "panel" || audienceRaw === "panel_users") {
      audience = audienceRaw;
    } else if (
      audienceRaw === "users" ||
      (Array.isArray(body.userIds) && (body.userIds as unknown[]).length > 0) ||
      (typeof body.userIds === "string" && String(body.userIds).trim() !== "")
    ) {
      audience = "users";
    }

    const userIds = parseIds(body.userIds ?? body.userId);
    const panelUserIds = parseIds(
      body.panelUserIds ?? body.panel_user_ids ?? body.userIds
    );
    const isSendNow = body.isSendNow !== false;
    const isSaveData = body.isSaveData !== false;
    const image = String(body.image ?? "").trim();

    if (!title || !text) {
      return res.status(400).json({
        success: false,
        message: "عنوان و متن اعلان الزامی است."
      });
    }
    if (audience === "users" && userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "حداقل یک شناسه کاربر وارد کنید."
      });
    }
    if (audience === "panel_users" && panelUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "حداقل یک شناسه کاربر پنل وارد کنید."
      });
    }
    if (!isSendNow) {
      return res.status(400).json({
        success: false,
        message: "زمان‌بندی فعلاً پشتیبانی نمی‌شود؛ ارسال فوری را فعال کنید."
      });
    }

    // Panel staff inbox
    if (audience === "panel" || audience === "panel_users") {
      if (!isSaveData) {
        return res.status(400).json({
          success: false,
          message: "برای مخاطبان پنل، ذخیره در صندوق اعلان الزامی است."
        });
      }
      const targets =
        audience === "panel" ? [0] : panelUserIds;
      const saved = await savePanelInboxRows({
        authHeader,
        title,
        text,
        action,
        notificationType:
          audience === "panel" ? "system" : notificationType,
        panelUserIds: targets,
        audience
      });
      return res.status(200).json({
        success: true,
        result: {
          audience,
          panelUserIds: audience === "panel_users" ? panelUserIds : undefined,
          broadcast: audience === "panel",
          savedToInbox: true,
          ...(typeof saved === "object" && saved && "result" in saved
            ? { upstream: (saved as { result?: unknown }).result }
            : { saved })
        }
      });
    }

    const upstreamBody: Record<string, unknown> = {
      title,
      text,
      action,
      notification_type: audience === "all" ? "system" : notificationType,
      isSendNow: true,
      isSaveData,
      sentAt: new Date().toISOString(),
      audience,
      ...(image ? { image } : {})
    };

    if (audience === "all") {
      upstreamBody.topic = "all";
      upstreamBody.userIds = [0];
    } else {
      upstreamBody.userIds = userIds;
    }

    const upstream = await fetch(resolveApiUrl(PANEL_ROUTES.sendNotif), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(upstreamBody)
    });
    const upstreamText = await upstream.text();
    let upstreamJson: Record<string, unknown> = {};
    try {
      upstreamJson = upstreamText ? JSON.parse(upstreamText) : {};
    } catch {
      upstreamJson = { raw: upstreamText.slice(0, 300) };
    }

    if (!upstream.ok) {
      return res.status(502).json({
        success: false,
        message: "سرویس ارسال اعلان پاسخ نامعتبر داد.",
        upstream: upstreamJson
      });
    }

    return res.status(200).json({
      success: true,
      result: {
        audience,
        userIds: audience === "users" ? userIds : undefined,
        topic: audience === "all" ? "all" : undefined,
        savedToInbox: isSaveData,
        push: upstreamJson
      }
    });
  } catch (error) {
    return handleError(res, error);
  }
}
