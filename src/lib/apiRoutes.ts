/**
 * Canonical webhook paths consumed by the frontend.
 * Relative paths are resolved against BASE_URL in fragment.tsx.
 */
const DEFAULT_API_BASE_URL = "https://sayban.darkube.ir/webhook/";

function normalizeBaseUrl(value: string | undefined): string {
  const trimmed = (value || "").trim();
  if (!trimmed) return DEFAULT_API_BASE_URL;
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

/**
 * Override per environment with `NEXT_PUBLIC_API_BASE_URL`; must stay a webhook
 * base with a trailing slash. Falls back to production so existing deployments
 * keep working without new env vars.
 */
export const API_BASE_URL = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_API_BASE_URL
);

/**
 * Resolve a relative Sayban API path against API_BASE_URL.
 * Absolute http(s) URLs are returned unchanged (third-party only).
 */
/**
 * `/api/*` paths that are served by n8n webhooks rather than Next.js BFF
 * routes, so `resolveClientApiUrl` sends them to API_BASE_URL instead of the
 * app origin. Every entry must exist as an n8n webhook path.
 *
 * `api/center` is the public unauthenticated center webhook under
 * `https://sayban.darkube.ir/webhook/api/center/` (not the app origin —
 * otherwise test hosts like sayban-test would call themselves).
 */
export const WEBHOOK_API_PATHS = ["/api/center"] as const;

export const PUBLIC_ROUTES = {
  center: "/center/",
  /** Unauthenticated, fully enriched center profile (accepts MD5 center id). */
  centerPublic: "/api/center/",
  centers: "/centers",
  categoriesFull: "categories/full",
  search: "/search",
  serviceHoliday: "/service/holiday",
  serviceWorking: "/service/working/",
  reservation: "/Reservation",
  setComment: "set/comment/",
  city: "city",
  staffServices: "/staffServices",
  patients: "/patients",
  /** Name-only guest login → JWT in `data.token` (same cookie as OTP). */
  usersGuest: "users/guest",
  /** Delete the signed-in guest row when it still has no mobile. */
  usersGuestRetire: "users/guest/retire",
  address: "/address",
  /** GET list of the signed-in user's favorite centers. */
  favorites: "favorites",
  /** POST { center_id } toggles favorite. Response { success, favorited }. */
  favoritesToggle: "favorites/toggle",
  /** GET ?center_id= → { success, favorited }. */
  favoritesStatus: "favorites/status",
  /** Read (GET) / move (POST { address_id }) the user's selected address. */
  addressCurrent: "address/current",
  addAddress: "add/address",
  updatePatient: "update/patient",
  deletePatient: "delete/patient",
  updateAddress: "update/address",
  deleteAddress: "delete/address",

  /** Public FCM token upsert: POST { token, platform }. Bearer user JWT. */
  setFcmToken: "setFcmToken",

  /** Support chat (user) — list conversations */
  supportConversations: "support/conversations/",
  supportConversationsCreate: "support/conversations/create",

  /** Reminders (لیاد) — Sayban n8n workflow `reminders` */
  reminders: "reminders",
  remindersEdit: "reminders/edit",
  remindersPause: "reminders/pause",
  remindersResume: "reminders/resume",
  remindersCancel: "reminders/cancel",
  remindersDelete: "reminders/delete",
  remindersCategories: "reminders/categories",
  remindersOccasions: "reminders/occasions",
  remindersSuggestions: "reminders/suggestions",
  /** Cost preview for channel picker (Report2). */
  reportInsert: "report/insert",
  /** Legacy UI aliases */
  userTaskList: "user/task/list",
  userTaskAdd: "user/task/add",
  userTaskEdit: "user/task/edit",
  /** Liad wallet */
  wallet: "wallet",
  walletTransactions: "wallet/transactions",
  walletTopup: "wallet/topup",
  walletTopupConfirm: "wallet/topup/confirm",
} as const;

/** User conversation messages (GET + POST). */
export function userSupportMessagesPath(id: string | number) {
  return `support-user-get-messages/support/conversations/${id}/messages`;
}

/** Center panel / dashboard */
export const PANEL_ROUTES = {
  center: "/panel/center",
  centers: "/panel/centers",
  updateInfo: "/panel/update/info",
  updateProfile: "panel/update/profile",
  updateImage: "panel/update/image",
  updateService: "/panel/update/service",
  updateCenter: "panel/update/center",
  /** Enable/disable a center's panel login: POST { center_id, is_active }. */
  centerAccountStatus: "/panel/center/account-status",
  /** Enable/disable the center listing itself: POST { center_id, is_active }. */
  centerActiveStatus: "/panel/center/active-status",
  /** Create/update center_admin profile: POST { id? | center_id, name, email, mobile, password? }. */
  usersEdit: "/panel/users/edit",
  /** Hard-delete an app user (super_admin). POST { id }. */
  usersDelete: "/panel/users/delete",
  /**
   * Registration dossier for Super Admin review:
   * GET ?id=  → center + docs + account flags
   */
  centerRegistration: "/panel/center/registration",
  /**
   * Approve / reject a self-serve signup:
   * POST { center_id, approval_status: 'approved' | 'rejected' }
   * Also syncs centers.is_active and center_admin panel__users.is_active.
   */
  centerApproval: "/panel/center/approval",
  /** Self-serve center signup phase 1: create pending center + admin → center_id. */
  userRegister: "/panel/user/register",
  /** Self-serve center signup phase 2: update complementary fields by center_id. */
  userRegisterComplete: "/panel/user/register/complete",
  /** Panel staff FCM token upsert: POST { token, platform }. Bearer panel JWT. */
  setFcmToken: "panel/setFcmToken",
  /** Panel staff inbox (mirrors users__notification). */
  notifications: "panel/notifications",
  notificationsSeen: "panel/notifications/seen",
  notificationsAdd: "panel/notifications/add",
  /**
   * @deprecated File bytes must go browser → Liom directly.
   * Kept only for legacy Plasmic paths; prefer `uploadPanelImage` + `registerUpload`.
   */
  uploadImage: "/upload/image",
  /** URL-only registry: POST { url, original_name?, mime_type? } → panel__uploads. */
  registerUpload: "/panel/uploads",
  /** Attach already-uploaded CDN URLs to a center gallery: POST { center_id, images:[{url}] }. */
  addImage: "/add/image",

  /**
   * Center reviews management. The center is derived from the JWT server-side,
   * so these take no center parameter.
   */
  reviews: "/panel/reviews",
  reviewsReply: "/panel/reviews/reply",
  reviewsClearReply: "/panel/reviews/clear-reply",
  reviewsDelete: "/panel/reviews/delete",

  /** FAQ CRUD */
  faqs: "/panel/faqs",
  faqsAdd: "/panel/faqs/add",
  faqsUpdate: "/panel/faqs/update",
  faqsDelete: "/panel/faqs/delete",

  /** Amenities library & center selection */
  amenitiesLibrary: "/panel/amenities/library",
  amenities: "/panel/amenities",
  amenitiesSync: "/panel/amenities/sync",
  amenitiesRequest: "/panel/amenities/request",
  amenitiesRequests: "/panel/amenities/requests",

  /** Care & treatment (from faqs n8n workflow) */
  careItemsLibrary: "/panel/care-items/library",
  careItems: "/panel/care-items",
  careItemsSync: "/panel/care-items/sync",
  specialists: "/panel/specialists",
  specialistsAdd: "/panel/specialists/add",
  specialistsUpdate: "/panel/specialists/update",
  specialistsDelete: "/panel/specialists/delete",

  /** Daily life */
  dailySchedule: "/panel/daily-schedule",
  dailyScheduleUpdate: "/panel/daily-schedule/update",
  activitiesLibrary: "/panel/activities/library",
  activities: "/panel/activities",
  activitiesSync: "/panel/activities/sync",

  /** Family visit policy */
  visitPolicy: "/panel/visit-policy",
  visitPolicyUpdate: "/panel/visit-policy/update",

  /** Tag library (Super Admin — homepage elements) */
  tags: "/panel/tags",
  tagsAdd: "/panel/tags/add",
  tagsDelete: "/panel/tags/delete",

  /** Super Admin push + inbox (n8n `notification` workflow). */
  sendNotif: "send-notif",
  /** Panel staff push + `panel__notification` inbox. */
  sendNotifPanel: "send-notif-panel",

  /** Legacy questionnaire endpoints (reservation forms, not profile FAQ) */
  question: "/panel/question",
  questionUpdate: "/panel/question/update",
  questionDelete: "/panel/question/delete",

  /** Support chat (SuperAdmin) */
  supportConversations: "panel/support/conversations",
} as const;

export type PublicRouteKey = keyof typeof PUBLIC_ROUTES;
export type PanelRouteKey = keyof typeof PANEL_ROUTES;

export function resolveApiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return `${API_BASE_URL}${normalized}`;
}

/** Canonical n8n webhook paths for Support conversations. */
export const SUPPORT_WEBHOOK = {
  userListConversations: "support/conversations/",
  userCreateConversation: "support/conversations/create",
  panelListConversations: "panel/support/conversations",
  userMessages: (id: string | number) => userSupportMessagesPath(id),
  userClose: (id: string | number) =>
    `user-support-close/support/conversations/${id}/close`,
  panelMessages: (id: string | number) =>
    `panel-support-messages/panel/support/conversations/${id}/messages`,
  panelReply: (id: string | number) =>
    `panel-support-reply/panel/support/conversations/${id}/reply`,
  panelStatus: (id: string | number) =>
    `panel-support-status/panel/support/conversations/${id}/status`,
  panelClose: (id: string | number) =>
    `panel-support-close/panel/support/conversations/${id}/close`
} as const;

/** Parse user messages path; returns conversation id or null. */
export function parseUserSupportMessagesPath(path: string): number | null {
  const canonical = path.match(
    /^support-user-get-messages\/support\/conversations\/(\d+)\/messages$/
  );
  if (canonical) return Number(canonical[1]);

  return null;
}

/** Map internal `/api/support/*` path to canonical n8n webhook path. */
export function resolveUserSupportWebhookPath(
  internalPath: string,
  method: string
): string | null {
  const httpMethod = method.toUpperCase();

  if (internalPath === "conversations/create" && httpMethod === "POST") {
    return SUPPORT_WEBHOOK.userCreateConversation;
  }
  if (internalPath === "conversations" && httpMethod === "GET") {
    return SUPPORT_WEBHOOK.userListConversations;
  }

  const messagesId = parseUserSupportMessagesPath(internalPath);
  if (messagesId != null && (httpMethod === "GET" || httpMethod === "POST")) {
    return SUPPORT_WEBHOOK.userMessages(messagesId);
  }

  const closeMatch = internalPath.match(/^conversations\/(\d+)\/close$/);
  if (closeMatch && httpMethod === "POST") {
    return SUPPORT_WEBHOOK.userClose(closeMatch[1]);
  }

  return null;
}

/** Map internal `/api/panel/support/*` path to canonical n8n webhook path. */
export function resolvePanelSupportWebhookPath(
  internalPath: string,
  method: string
): string | null {
  const httpMethod = method.toUpperCase();
  const pathOnly = internalPath.split("?")[0];

  if (pathOnly === "conversations" && httpMethod === "GET") {
    return SUPPORT_WEBHOOK.panelListConversations;
  }

  const messagesMatch = pathOnly.match(/^conversations\/(\d+)\/messages$/);
  if (messagesMatch && httpMethod === "GET") {
    return SUPPORT_WEBHOOK.panelMessages(messagesMatch[1]);
  }

  const replyMatch = pathOnly.match(/^conversations\/(\d+)\/reply$/);
  if (replyMatch && httpMethod === "POST") {
    return SUPPORT_WEBHOOK.panelReply(replyMatch[1]);
  }

  const statusMatch = pathOnly.match(/^conversations\/(\d+)\/status$/);
  if (statusMatch && httpMethod === "POST") {
    return SUPPORT_WEBHOOK.panelStatus(statusMatch[1]);
  }

  const closeMatch = pathOnly.match(/^conversations\/(\d+)\/close$/);
  if (closeMatch && httpMethod === "POST") {
    return SUPPORT_WEBHOOK.panelClose(closeMatch[1]);
  }

  return null;
}
