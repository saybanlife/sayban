import type {
  SupportConversation,
  SupportListStatusFilter,
  SupportMessage,
  SupportStatus
} from "./supportTypes";
import { readCookie } from "./supportTypes";
import type {
  SupportCallbackRequest,
  SupportCallbackTimePreference
} from "./supportCallbackModel";
import { userSupportMessagesPath } from "../../src/lib/apiRoutes";

type ApiResult<T> = {
  ok: boolean;
  data: T & { success?: boolean; message?: string; result?: unknown };
};

/** Same-origin Support API (MySQL when configured, else n8n proxy). */
function supportUrl(path: string) {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `/api/support/${normalized}`;
}

function panelSupportUrl(path: string) {
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `/api/panel/support/${normalized}`;
}

async function supportRequest<T = Record<string, unknown>>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  tokenOverride?: string
): Promise<ApiResult<T>> {
  const token =
    tokenOverride || readCookie("token") || readCookie("panelToken");
  const res = await fetch(supportUrl(path), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    success?: boolean;
    message?: string;
    result?: unknown;
  };
  return { ok: res.ok, data };
}

async function panelRequest<T = Record<string, unknown>>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  tokenOverride?: string
): Promise<ApiResult<T>> {
  const token = tokenOverride || readCookie("panelToken");
  const res = await fetch(panelSupportUrl(path), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    success?: boolean;
    message?: string;
    result?: unknown;
  };
  return { ok: res.ok, data };
}

export async function createSupportConversation(message: string) {
  return supportRequest<{ result?: SupportConversation }>(
    "POST",
    "conversations/create",
    { message: message.trim() }
  );
}

export async function getMySupportConversations() {
  return supportRequest<{ result?: SupportConversation[] }>(
    "GET",
    "conversations"
  );
}

export async function getSupportMessages(conversationId: string | number) {
  return supportRequest<{ result?: SupportMessage[] }>(
    "GET",
    userSupportMessagesPath(conversationId)
  );
}

export async function sendSupportMessage(
  conversationId: string | number,
  message: string,
  attachmentUrl?: string
) {
  return supportRequest<{ result?: SupportMessage }>(
    "POST",
    userSupportMessagesPath(conversationId),
    {
      message: message.trim(),
      ...(attachmentUrl ? { attachment_url: attachmentUrl } : {})
    }
  );
}

export async function closeMySupportConversation(
  conversationId: string | number
) {
  return supportRequest("POST", `conversations/${conversationId}/close`);
}

export async function panelListSupportConversations(
  token: string | undefined,
  params?: { status?: SupportListStatusFilter; q?: string }
) {
  const query = new URLSearchParams();
  if (params?.status && params.status !== "all") {
    query.set("status", params.status);
  }
  if (params?.q?.trim()) query.set("q", params.q.trim());
  const qs = query.toString();
  return panelRequest<{ result?: SupportConversation[] }>(
    "GET",
    `conversations${qs ? `?${qs}` : ""}`,
    undefined,
    token
  );
}

export async function panelGetSupportMessages(
  token: string | undefined,
  conversationId: string | number
) {
  return panelRequest<{ result?: SupportMessage[] }>(
    "GET",
    `conversations/${conversationId}/messages`,
    undefined,
    token
  );
}

export async function panelReplySupport(
  token: string | undefined,
  conversationId: string | number,
  message: string
) {
  return panelRequest<{ result?: SupportMessage }>(
    "POST",
    `conversations/${conversationId}/reply`,
    { message: message.trim() },
    token
  );
}

export async function panelChangeSupportStatus(
  token: string | undefined,
  conversationId: string | number,
  status: SupportStatus
) {
  return panelRequest(
    "POST",
    `conversations/${conversationId}/status`,
    { status },
    token
  );
}

export async function panelCloseSupportConversation(
  token: string | undefined,
  conversationId: string | number
) {
  return panelRequest(
    "POST",
    `conversations/${conversationId}/close`,
    undefined,
    token
  );
}

export async function createSupportCallbackRequest(
  body: {
    phone: string;
    time_preference?: SupportCallbackTimePreference;
    preferred_time?: string | null;
    source?: string | null;
  },
  tokenOverride?: string
) {
  return supportRequest<{ result?: SupportCallbackRequest }>(
    "POST",
    "callbacks/create",
    {
      phone: body.phone,
      time_preference: body.time_preference || "anytime",
      preferred_time: body.preferred_time ?? null,
      source: body.source || "nurse_request"
    },
    tokenOverride
  );
}

export async function panelListSupportCallbacks(token: string | undefined) {
  return panelRequest<{ result?: SupportCallbackRequest[] }>(
    "GET",
    "callbacks",
    undefined,
    token
  );
}
