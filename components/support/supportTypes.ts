export type SupportStatus = "open" | "pending" | "answered" | "closed";

/** Panel list filter; `unanswered` = open + pending (awaiting admin reply). */
export type SupportListStatusFilter = SupportStatus | "all" | "unanswered";

export type SupportSenderType = "user" | "superadmin";

export type SupportConversation = {
  id: number;
  user_id: number;
  status: SupportStatus;
  last_message?: string | null;
  last_message_at?: string | null;
  message_count?: number;
  created_at?: string;
  updated_at?: string;
  closed_at?: string | null;
  user_name?: string | null;
  user_mobile?: string | null;
};

export type SupportMessage = {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_type: SupportSenderType;
  message: string;
  attachment_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  open: "جدید",
  pending: "در حال بررسی",
  answered: "پاسخ داده شد",
  closed: "بسته شده"
};

export const SUPPORT_PHONE = "09001596357";

export function extractSupportChatIdFromSlug(
  slug: string | string[] | undefined
): string | null {
  const parts = Array.isArray(slug) ? slug : slug ? [slug] : [];
  const hit = parts.find(part => String(part).startsWith("support_chat_"));
  if (!hit) return null;
  const id = String(hit).slice("support_chat_".length).trim();
  return id || null;
}

export function isSupportLandingSlug(
  slug: string | string[] | undefined
): boolean {
  const parts = Array.isArray(slug) ? slug : slug ? [slug] : [];
  return parts.some(part => {
    const value = String(part).trim().toLowerCase();
    return value === "support" || value === "پشتیبانی";
  });
}

export function readCookie(name: string) {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(
    new RegExp(
      `(?:^|; )${name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1")}=([^;]*)`
    )
  );
  return match ? decodeURIComponent(match[1]) : "";
}

export function formatSupportDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  } catch {
    return date.toLocaleString("fa-IR");
  }
}

export function normalizeSupportMessages(raw: unknown): SupportMessage[] {
  if (Array.isArray(raw)) {
    return raw.filter(Boolean) as SupportMessage[];
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.result)) return obj.result as SupportMessage[];
    if (Array.isArray(obj.messages)) return obj.messages as SupportMessage[];
  }
  return [];
}

export function normalizeSupportConversations(raw: unknown): SupportConversation[] {
  if (Array.isArray(raw)) {
    return raw.filter(Boolean) as SupportConversation[];
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.result)) return obj.result as SupportConversation[];
  }
  return [];
}
