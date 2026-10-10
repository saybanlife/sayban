/**
 * Map panel sidebar menu icon keys onto `MenuIcon` variants.
 *
 * Plasmic menu data sometimes uses lucide-style names (`building-2`, `bell`)
 * that are not MenuIcon variants — those render blank. Prefer menu `value`
 * for top-level items, then normalize the raw `icon` string.
 */

/** Valid `MenuIcon` `icons` variant names used by the panel sidebar. */
export type PanelMenuIconName =
  | "dashboard"
  | "building"
  | "users"
  | "service"
  | "layers"
  | "calendar"
  | "pey"
  | "questioncircle"
  | "message"
  | "notification"
  | "notebook"
  | "history"
  | "target"
  | "warning"
  | "settings"
  | "online";

const MENU_VALUE_ICONS: Record<string, PanelMenuIconName> = {
  dashboard: "dashboard",
  center: "building",
  users: "users",
  centers: "building",
  list: "notebook",
  inactive: "warning",
  services: "service",
  staffs: "users",
  categories: "layers",
  reservations: "calendar",
  reservations_all: "notebook",
  reservations_today: "calendar",
  reservations_canceled: "warning",
  payments: "pey",
  all: "pey",
  success: "online",
  failed: "warning",
  question: "questioncircle",
  home_elements: "layers",
  home_slider: "layers",
  tags: "target",
  support: "message",
  send_notif: "notification",
  reviews: "message",
  notifications: "notification"
};

/** Aliases from lucide / ad-hoc names → MenuIcon variants. */
const ICON_ALIASES: Record<string, PanelMenuIconName> = {
  dashboard: "dashboard",
  building: "building",
  "building-2": "building",
  users: "users",
  "user-x": "users",
  service: "service",
  layers: "layers",
  folder: "layers",
  "folder-tree": "layers",
  calendar: "calendar",
  "calendar-check": "calendar",
  "calendar-x": "warning",
  clock: "history",
  history: "history",
  pey: "pey",
  "credit-card": "pey",
  list: "notebook",
  notebook: "notebook",
  ban: "warning",
  warning: "warning",
  "check-circle": "online",
  online: "online",
  "x-circle": "warning",
  tag: "target",
  target: "target",
  "message-circle": "message",
  message: "message",
  bell: "notification",
  notification: "notification",
  notif: "notification",
  questioncircle: "questioncircle",
  settings: "settings"
};

const KNOWN = new Set<string>(Object.values(MENU_VALUE_ICONS));

export function resolvePanelMenuIcon(input: {
  value?: unknown;
  icon?: unknown;
}): PanelMenuIconName {
  const value = String(input.value ?? "").trim();
  if (value && MENU_VALUE_ICONS[value]) return MENU_VALUE_ICONS[value];

  const icon = String(input.icon ?? "").trim();
  if (icon && ICON_ALIASES[icon]) return ICON_ALIASES[icon];
  if (icon && KNOWN.has(icon)) return icon as PanelMenuIconName;

  return "dashboard";
}

export function withPanelMenuIcon<T>(item: T): T {
  if (!item || typeof item !== "object") return item;
  const record = item as Record<string, unknown>;
  const icon = resolvePanelMenuIcon({
    value: record.value,
    icon: record.icon
  });
  const children = Array.isArray(record.children)
    ? record.children.map(child => withPanelMenuIcon(child))
    : record.children;
  return { ...record, icon, ...(children !== undefined ? { children } : {}) } as T;
}
