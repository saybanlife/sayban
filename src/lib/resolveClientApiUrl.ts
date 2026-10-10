/**
 * Shared client URL resolution for Fragment/ApiRequest.
 * All Sayban business APIs resolve against API_BASE_URL
 * (`https://sayban.darkube.ir/webhook/`).
 *
 * Legacy Liad absolute hosts (`n8n.staas.ir`) are rewritten to the same
 * Sayban webhook paths so reminder/wallet UI cannot keep calling staas.
 */
import { API_BASE_URL, WEBHOOK_API_PATHS } from "./apiRoutes";

const STAAS_WEBHOOK_HOSTS = [
  "https://n8n.staas.ir/webhook/",
  "http://n8n.staas.ir/webhook/"
] as const;

/** Path aliases from legacy Liad URLs → Sayban `reminders` workflow paths. */
const REMINDER_PATH_ALIASES: Record<string, string> = {
  "reminders/category": "reminders/categories",
  "reminders/suggestions1": "reminders/suggestions",
  "hamyar/reminder": "user/task/add"
};

function isWebhookApiPath(normalized: string): boolean {
  const withoutTrailingSlash = normalized.replace(/\/+$/, "");
  return WEBHOOK_API_PATHS.some(p => withoutTrailingSlash === p);
}

function stripWebhookBase(url: string): string | null {
  for (const host of STAAS_WEBHOOK_HOSTS) {
    if (url.startsWith(host)) {
      return url.slice(host.length).replace(/^\/+/, "");
    }
  }
  return null;
}

function applyReminderAliases(path: string): string {
  const withoutQuery = path.split("?")[0].replace(/^\/+/, "").replace(/\/+$/, "");
  const query = path.includes("?") ? path.slice(path.indexOf("?")) : "";
  const mapped = REMINDER_PATH_ALIASES[withoutQuery] || withoutQuery;
  return `${mapped}${query}`;
}

/**
 * True when the absolute URL is a legacy staas webhook that must be moved
 * onto Sayban's reminder/wallet surface (or any staas webhook path we own).
 */
export function isLegacyStaasWebhookUrl(url: string): boolean {
  return stripWebhookBase(url) != null;
}

export function resolveClientApiUrl(url: string): string {
  if (!url) return url;

  const staasPath = stripWebhookBase(url);
  if (staasPath != null) {
    const mapped = applyReminderAliases(staasPath);
    return `${API_BASE_URL}${mapped}`;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  const normalized = url.startsWith("/") ? url : `/${url}`;
  // Keep Next.js BFF routes on the same origin (do not prefix webhook base),
  // except paths that n8n itself serves under the webhook base.
  if (
    (normalized === "/api" || normalized.startsWith("/api/")) &&
    !isWebhookApiPath(normalized)
  ) {
    return normalized;
  }
  const withoutLeading = normalized.startsWith("/")
    ? normalized.slice(1)
    : normalized;
  const mapped = applyReminderAliases(withoutLeading);
  return `${API_BASE_URL}${mapped}`;
}
