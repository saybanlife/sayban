/** Shared helpers for public user reminders (لیاد). */

export const DEFAULT_REMINDER_TIME = "09:30";
export const DEFAULT_REMINDER_CHANNELS = ["notification"] as const;

/**
 * @deprecated All reminder types are addable; kept for call-site compatibility.
 * Prefer treating every catalog type as selectable.
 */
export const ADDABLE_REMINDER_TYPES = new Set([
  "medicine_time",
  "appointment",
  "occasion"
]);

export const ALL_WEEKDAYS = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday"
] as const;

/** Channel unit prices (تومان) — matches `reminder_channel_prices`. */
export const REMINDER_CHANNEL_UNIT_PRICES: Record<string, number> = {
  notification: 0,
  sms: 500,
  bale: 200,
  telegram: 0
};

const CHANNEL_META: {
  type: string;
  name: string;
  icon_path: string;
}[] = [
  {
    type: "notification",
    name: "نوتیفیکیشن/اپ",
    icon_path:
      "https://teh-3.s3.poshtiban.com/lioms3/2026-06/panel/liad/2026-06-06-b48be7d5-b980-46c1-8232-72fa509d5524.png"
  },
  {
    type: "sms",
    name: "پیامک",
    icon_path:
      "https://teh-3.s3.poshtiban.com/lioms3/2026-06/panel/liad/2026-06-06-5a0251eb-b32f-4320-991f-4d5781300499.png"
  },
  {
    type: "bale",
    name: "بله",
    icon_path:
      "https://teh-3.s3.poshtiban.com/lioms3/2026-06/panel/liad/2026-06-06-14b8291c-5c9e-442d-acca-c6ef11d51b2a.png"
  }
];

export function normalizeReminderChannels(reminder: {
  channels?: unknown;
  chanels?: unknown;
}): string {
  const pick = (value: unknown): string => {
    if (value == null || value === "" || value === "{") return "";
    if (Array.isArray(value)) return JSON.stringify(value);
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed && trimmed !== "{" ? trimmed : "";
    }
    return "";
  };
  return pick(reminder.channels) || pick(reminder.chanels) || "[]";
}

function asJsonArrayString(value: unknown, fallback = "[]"): string {
  if (value == null || value === "" || value === "{") return fallback;
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || trimmed === "{") return fallback;
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? JSON.stringify(parsed) : fallback;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function parseJsonArray(value: unknown): unknown[] {
  if (value == null || value === "" || value === "{") return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Map DB snake_case schedule types onto Liad UI camelCase. */
export function normalizeReminderScheduleType(raw: unknown): string {
  const s = String(raw || "").trim();
  if (s === "every_day" || s === "everyDay") return "everyDay";
  if (s === "every_year" || s === "everyYear") return "everyYear";
  if (s === "once") return "once";
  return s || "everyDay";
}

/**
 * Annual placeholders are stored as `0000-MM-DD`. `new Date("0000-…")` is
 * Invalid Date in browsers, so homepage / settings filters drop them. Expand
 * to the next Gregorian occurrence for display (save path still re-zeros year).
 */
export function expandAnnualDatesForDisplay(
  datesRaw: unknown,
  scheduleType: string
): string {
  const dates = parseJsonArray(datesRaw);
  if (!dates.length) return asJsonArrayString(datesRaw, "[]");

  const isAnnual =
    scheduleType === "everyYear" ||
    dates.some(d => /^0000-\d{2}-\d{2}$/.test(String(d).trim()));

  if (!isAnnual) return asJsonArrayString(datesRaw, "[]");

  const now = new Date();
  const yNow = now.getFullYear();
  const mNow = now.getMonth() + 1;
  const dNow = now.getDate();
  const todayKey = yNow * 10000 + mNow * 100 + dNow;

  const expanded = dates.map(raw => {
    const text = String(raw ?? "").trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (!match) return text;
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31
    ) {
      return text;
    }
    const thisYearKey = yNow * 10000 + month * 100 + day;
    const year = thisYearKey >= todayKey ? yNow : yNow + 1;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });

  return JSON.stringify(expanded);
}

/**
 * Cost preview for Report2 (`POST report/insert`). Mirrors legacy Liad response
 * shape with Sayban channel prices (notification/sms/bale).
 */
export function buildReminderCostReport(payload: unknown): {
  results: Record<string, unknown>[];
  total: number;
  totalNotifications: number;
  totalPerChannel: Record<string, unknown>[];
} {
  const root =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const rem =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root;

  const schedule_type = normalizeReminderScheduleType(rem.schedule_type);
  const times = parseJsonArray(rem.times);
  const timesPerDay = times.length || 0;
  const preRaw = Array.isArray(rem.pre)
    ? rem.pre
    : parseJsonArray(rem.pre_reminders);
  const preCount = preRaw.filter(x => x != null && x !== "").length;

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  const finishAt = rem.finishTime || rem.finish_at;
  let horizonEnd = new Date(endDate);
  if (finishAt) {
    const finish = new Date(String(finishAt));
    if (!Number.isNaN(finish.getTime()) && finish < horizonEnd) {
      horizonEnd = finish;
    }
  }

  let activeDays = 0;
  const dates = parseJsonArray(rem.dates);
  if (schedule_type === "everyYear" || schedule_type === "once") {
    activeDays = Math.max(dates.length, dates.length === 0 ? 1 : dates.length);
  } else {
    const weekdays = parseJsonArray(rem.weekdays).map(w =>
      String(w).toLowerCase()
    );
    const weekdaySet = new Set(weekdays);
    const cursor = new Date(startDate);
    while (cursor <= horizonEnd) {
      if (!weekdaySet.size) {
        activeDays += 1;
      } else {
        const name = cursor
          .toLocaleDateString("en-US", { weekday: "long" })
          .toLowerCase();
        if (weekdaySet.has(name)) activeDays += 1;
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const totalNotifications = activeDays * timesPerDay + preCount;
  const period = schedule_type === "everyDay" ? "ماه" : "سال";
  const costs: Record<string, number> = {
    notification:
      REMINDER_CHANNEL_UNIT_PRICES.notification * totalNotifications,
    sms: REMINDER_CHANNEL_UNIT_PRICES.sms * totalNotifications,
    bale: REMINDER_CHANNEL_UNIT_PRICES.bale * totalNotifications,
    telegram: 0
  };

  return {
    results: [
      {
        name: rem.name || rem.title || "",
        schedule_type,
        timesPerDay,
        activeDays,
        preCount,
        totalNotifications,
        totalLabel: `${totalNotifications} عدد در ${period}`,
        costs,
        totalCost: 0,
        startDate: startDate.toISOString(),
        endDate: horizonEnd.toISOString()
      }
    ],
    total: 0,
    totalNotifications,
    totalPerChannel: CHANNEL_META.map(ch => ({
      icon_path: ch.icon_path,
      type: ch.type,
      name: ch.name,
      value: REMINDER_CHANNEL_UNIT_PRICES[ch.type] ?? 0
    }))
  };
}

/**
 * One reminder row ready for Plasmic Reminder / ReminderSetting filters:
 * JSON fields as strings, `active` as 0|1, schedule_type camelCase,
 * everyDay with empty weekdays → all weekdays (homepage weekday filter).
 */
export function normalizeReminderListItem(
  reminder: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!reminder || typeof reminder !== "object") return null;

  const schedule_type = normalizeReminderScheduleType(reminder.schedule_type);
  let weekdays = asJsonArrayString(reminder.weekdays, "[]");
  if (schedule_type === "everyDay" && parseJsonArray(weekdays).length === 0) {
    weekdays = JSON.stringify([...ALL_WEEKDAYS]);
  }

  const status = String(reminder.status || "").toLowerCase();
  let active = reminder.active;
  if (active == null) {
    active = status === "active" || status === "" ? 1 : 0;
  } else if (typeof active === "boolean") {
    active = active ? 1 : 0;
  } else {
    active = Number(active) === 1 || active === "1" ? 1 : 0;
  }

  const channels = normalizeReminderChannels(reminder);
  const datesStored = asJsonArrayString(reminder.dates, "[]");
  const dates = expandAnnualDatesForDisplay(datesStored, schedule_type);

  const patientRaw =
    reminder.patientId ?? reminder.patient_id ?? null;
  const patientIdNum = Number(patientRaw);
  const patientId =
    Number.isFinite(patientIdNum) && patientIdNum > 0 ? patientIdNum : null;
  const patientName =
    reminder.patient_name != null
      ? String(reminder.patient_name)
      : reminder.patientName != null
        ? String(reminder.patientName)
        : null;
  const patientRelation =
    reminder.patient_relation != null
      ? String(reminder.patient_relation)
      : reminder.patientRelation != null
        ? String(reminder.patientRelation)
        : null;
  const imageUrlRaw =
    reminder.imageUrl ?? reminder.image_url ?? null;
  const imageUrl =
    imageUrlRaw != null && String(imageUrlRaw).trim()
      ? String(imageUrlRaw).trim()
      : null;

  return {
    ...reminder,
    schedule_type,
    weekdays,
    dates,
    /** Original annual placeholders (`0000-MM-DD`) when display dates were expanded. */
    datesAnnual: dates !== datesStored ? datesStored : undefined,
    times: asJsonArrayString(reminder.times, "[]"),
    pre_reminders:
      reminder.pre_reminders == null
        ? reminder.pre_reminders
        : asJsonArrayString(reminder.pre_reminders, "[]"),
    channels,
    chanels: channels,
    finishTime: reminder.finishTime ?? reminder.finish_at ?? null,
    liomId:
      reminder.liomId != null
        ? String(reminder.liomId)
        : reminder.user_id != null
          ? String(reminder.user_id)
          : null,
    patient_id: patientId,
    patientId,
    patient_name: patientName,
    patientName,
    patient_relation: patientRelation,
    patientRelation,
    image_url: imageUrl,
    imageUrl,
    status: status || (active === 1 ? "active" : "paused"),
    active
  };
}

/** Extract + normalize `reminders` from list API / already-normalized arrays. */
export function normalizeReminderList(data: unknown): Record<string, unknown>[] {
  let rows: unknown[] = [];
  if (Array.isArray(data)) {
    rows = data;
  } else if (data && typeof data === "object") {
    const root = data as Record<string, unknown>;
    if (Array.isArray(root.reminders)) rows = root.reminders;
    else if (Array.isArray(root.result)) rows = root.result;
    else if (Array.isArray(root.items)) rows = root.items;
  }
  return rows
    .map(row =>
      normalizeReminderListItem(
        row && typeof row === "object" ? (row as Record<string, unknown>) : null
      )
    )
    .filter((row): row is Record<string, unknown> => row != null);
}

/** True when catalog already has at least one selectable type entry. */
export function hasMedicineReminderCategory(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const root = data as Record<string, unknown>;
  const types = Array.isArray(root.type) ? root.type : [];
  for (const raw of types) {
    if (!raw || typeof raw !== "object") continue;
    const items = Array.isArray((raw as { items?: unknown }).items)
      ? ((raw as { items: unknown[] }).items)
      : [];
    if (items.length > 0) return true;
  }
  const cats = Array.isArray(root.category) ? root.category : [];
  return cats.length > 0;
}

function reminderUiIcon(raw: unknown, fallback = "medicine_time"): string {
  const icon = String(raw || fallback).trim() || fallback;
  // DB seed → MenuIcon variant names (camelCase via RadioGroupLiom).
  if (icon === "medicine") return "medicine_time";
  if (icon === "gift") return "occasion";
  return icon;
}

function synthesizeCategoryTypeGroup(c: {
  name: string;
  name_fa: string;
  icon: string;
  is_addable?: 0 | 1;
}) {
  return {
    category_name: c.name,
    category_name_fa: c.name_fa,
    icon: c.icon,
    items: [
      {
        type: c.name,
        type_fa: c.name_fa,
        name: c.name_fa,
        name_fa: c.name_fa,
        title_fa: c.name_fa,
        schedule_type: c.name === "medicine_time" ? "everyDay" : "everyYear",
        text:
          c.name === "medicine_time"
            ? "زمان مصرف دارو فرا رسیده است."
            : c.name_fa,
        icon: c.icon,
        label: c.name_fa,
        value: c.name,
        __addDisabled: false
      }
    ]
  };
}

/** Ensure category catalog has `.category` + `.type[].items` for ReminderCategory. */
export function normalizeReminderCategoryCatalog(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  const root = { ...(data as Record<string, unknown>) };

  const rawCategories = Array.isArray(root.category)
    ? root.category
    : Array.isArray(root.result)
      ? root.result
      : [];

  const iconByName = new Map<string, string>();

  const category = rawCategories.map(raw => {
    const row =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const name = String(row.name || row.code || "").trim();
    const name_fa = String(
      row.name_fa || row.title_fa || row.label || name
    ).trim();
    const icon = reminderUiIcon(row.icon || name || "medicine_time");
    // All categories are creatable in the public Liad UI.
    const is_addable = 1 as const;
    if (name) iconByName.set(name, icon);
    return {
      ...row,
      name,
      name_fa,
      title_fa: row.title_fa || name_fa,
      icon,
      is_addable,
      // RadioGroupLiom / sort chips
      label: name_fa,
      value: name
    };
  });

  let typeList = Array.isArray(root.type) ? [...root.type] : [];

  // Ensure every category chip has a matching type section (show all categories).
  const existingTypeNames = new Set(
    typeList
      .map(raw => {
        if (!raw || typeof raw !== "object") return "";
        const g = raw as Record<string, unknown>;
        return String(g.category_name || g.name || "").trim();
      })
      .filter(Boolean)
  );

  for (const c of category) {
    if (!c.name || existingTypeNames.has(c.name)) continue;
    typeList.push(synthesizeCategoryTypeGroup(c));
    existingTypeNames.add(c.name);
  }

  // Older / partial payloads may only have category rows — synthesize all.
  if (typeList.length === 0 && category.length > 0) {
    typeList = category
      .filter(c => Boolean(c.name))
      .map(c => synthesizeCategoryTypeGroup(c));
  }

  const type = typeList.map(rawGroup => {
    const group =
      rawGroup && typeof rawGroup === "object"
        ? (rawGroup as Record<string, unknown>)
        : {};
    const category_name = String(
      group.category_name || group.name || ""
    ).trim();
    const category_name_fa = String(
      group.category_name_fa || group.name_fa || category_name
    ).trim();
    const groupIcon = reminderUiIcon(
      iconByName.get(category_name) ||
        group.icon ||
        category_name ||
        "medicine_time"
    );

    const itemsRaw = Array.isArray(group.items) ? group.items : [];
    const items = itemsRaw.map(rawItem => {
      const item =
        rawItem && typeof rawItem === "object"
          ? (rawItem as Record<string, unknown>)
          : {};
      const itemType = String(item.type || item.name || category_name).trim();
      const type_fa = String(
        item.type_fa || item.name_fa || item.title_fa || item.label || itemType
      ).trim();
      const icon = reminderUiIcon(item.icon || groupIcon || itemType);
      return {
        ...item,
        type: itemType,
        type_fa,
        name: item.name || type_fa,
        name_fa: item.name_fa || type_fa,
        title_fa: item.title_fa || type_fa,
        schedule_type: normalizeReminderScheduleType(
          item.schedule_type ||
            (itemType === "medicine_time" ? "everyDay" : "everyYear")
        ),
        text:
          item.text ||
          (itemType === "medicine_time"
            ? "زمان مصرف دارو فرا رسیده است."
            : type_fa),
        icon,
        label: type_fa,
        value: itemType,
        __addDisabled: false
      };
    });

    // Empty type section still gets a placeholder so the category is visible.
    if (items.length === 0 && category_name) {
      items.push(
        synthesizeCategoryTypeGroup({
          name: category_name,
          name_fa: category_name_fa || category_name,
          icon: groupIcon,
          is_addable: 1
        }).items[0]
      );
    }

    return {
      ...group,
      category_name,
      category_name_fa,
      icon: groupIcon,
      items
    };
  });

  root.category = category;
  root.type = type;
  if (!Array.isArray(root.result)) root.result = category;
  return root;
}

/**
 * Weekdays for create/edit payloads. Prefer the weekday picker; else keep the
 * selected template's weekdays; else all days for everyDay (homepage filter).
 */
export function resolveReminderWeekdaysPayload(opts: {
  week?: unknown;
  existingWeekdays?: unknown;
  scheduleType?: unknown;
}): string | undefined {
  if (Array.isArray(opts.week) && opts.week.length > 0) {
    return JSON.stringify(opts.week);
  }
  const existing = opts.existingWeekdays;
  if (typeof existing === "string") {
    const trimmed = existing.trim();
    if (trimmed && trimmed !== "[]" && trimmed !== "{" && trimmed !== "null") {
      return trimmed;
    }
  } else if (Array.isArray(existing) && existing.length > 0) {
    return JSON.stringify(existing);
  }
  if (normalizeReminderScheduleType(opts.scheduleType) === "everyDay") {
    return JSON.stringify([...ALL_WEEKDAYS]);
  }
  return undefined;
}

export function isUsableReminderUserId(manId: unknown): manId is string {
  if (typeof manId !== "string") return false;
  const trimmed = manId.trim();
  return trimmed.length > 0 && !trimmed.includes("undefined");
}

/** Payload for ReminderSetting `#pageSelect1` edit flow (existing task). */
export function toReminderEditPageSelect(
  reminder: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!reminder || typeof reminder !== "object") return null;
  const next = { ...reminder };
  delete next.add;
  return next;
}

/** Triggers ReminderSetting hidden control that hydrates + opens edit dialog. */
export function clickReminderEditPageSelect() {
  if (typeof document === "undefined") return;
  window.setTimeout(() => {
    document.getElementById("pageSelect1")?.click();
  }, 0);
}

const REMINDER_DETAIL_EVENT = "sayban:reminder-detail";
const REMINDER_EDIT_EVENT = "sayban:reminder-edit";

export const REMINDER_DETAIL_CACHE_KEY = "reminderDetail";
export const REMINDER_EDIT_PENDING_KEY = "reminderEditPending";

/** `/reminder/reminder_123` (and any `/{page}/reminder_123`) → `"123"`. */
export function extractReminderIdFromSlug(
  slug: string | string[] | undefined
): string | null {
  const parts = Array.isArray(slug) ? slug : slug ? [slug] : [];
  const hit = parts.find(part => String(part).startsWith("reminder_"));
  if (!hit) return null;
  const id = String(hit).slice("reminder_".length).trim();
  return id || null;
}

export function cacheReminderDetail(
  reminder: Record<string, unknown> | null | undefined
) {
  if (typeof window === "undefined" || !reminder) return;
  try {
    window.sessionStorage.setItem(
      REMINDER_DETAIL_CACHE_KEY,
      JSON.stringify(reminder)
    );
  } catch {
    /* ignore quota */
  }
}

export function readCachedReminderDetail(
  reminderId: string
): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(REMINDER_DETAIL_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    if (String(parsed.id ?? "").trim() !== String(reminderId).trim()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function resolveReminderPageBase(): string {
  if (typeof window === "undefined") return "reminder";
  const segments = window.location.pathname.split("/").filter(Boolean);
  const first = segments[0] || "reminder";
  if (first === "dev") return "reminder";
  return first;
}

/**
 * Open reminder detail as a real Homepage route (`/{page}/reminder_{id}`),
 * matching ReservationDetails. Dev preview pages keep the CustomEvent fallback.
 */
export function requestReminderDetail(
  reminder: Record<string, unknown> | null | undefined
) {
  if (typeof window === "undefined" || !reminder) return;
  const id = String(reminder.id ?? "").trim();
  if (!id) return;
  cacheReminderDetail(reminder);

  const path = window.location.pathname || "";
  if (path.includes("/dev/")) {
    window.dispatchEvent(
      new CustomEvent(REMINDER_DETAIL_EVENT, { detail: reminder })
    );
    return;
  }

  const pageBase = resolveReminderPageBase();
  void import("next/router").then(({ default: Router }) => {
    void Router.push(`/${pageBase}/reminder_${id}`);
  });
}

/** Dev-preview only: subscribe to local detail overlay events. */
export function subscribeReminderDetail(
  listener: (reminder: Record<string, unknown>) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (ev: Event) => {
    const detail = (ev as CustomEvent).detail;
    if (detail && typeof detail === "object") {
      listener(detail as Record<string, unknown>);
    }
  };
  window.addEventListener(REMINDER_DETAIL_EVENT, handler);
  return () => window.removeEventListener(REMINDER_DETAIL_EVENT, handler);
}

function cachePendingReminderEdit(
  reminder: Record<string, unknown> | null | undefined
) {
  if (typeof window === "undefined" || !reminder) return;
  try {
    window.sessionStorage.setItem(
      REMINDER_EDIT_PENDING_KEY,
      JSON.stringify(reminder)
    );
  } catch {
    /* ignore */
  }
}

/** Consume one-shot edit intent after navigating back to the Reminder list. */
export function takePendingReminderEdit(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(REMINDER_EDIT_PENDING_KEY);
    window.sessionStorage.removeItem(REMINDER_EDIT_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/** Ask ReminderSetting to open edit for an existing reminder. */
export function requestReminderEdit(
  reminder: Record<string, unknown> | null | undefined
) {
  if (typeof window === "undefined" || !reminder) return;
  cachePendingReminderEdit(reminder);
  window.dispatchEvent(
    new CustomEvent(REMINDER_EDIT_EVENT, { detail: reminder })
  );
}

export function subscribeReminderEdit(
  listener: (reminder: Record<string, unknown>) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (ev: Event) => {
    const detail = (ev as CustomEvent).detail;
    if (detail && typeof detail === "object") {
      listener(detail as Record<string, unknown>);
    }
  };
  window.addEventListener(REMINDER_EDIT_EVENT, handler);
  return () => window.removeEventListener(REMINDER_EDIT_EVENT, handler);
}

/** Prefer image_url / imageUrl when present. */
export function reminderImageUrl(
  reminder: Record<string, unknown> | null | undefined
): string | null {
  if (!reminder) return null;
  const raw = reminder.imageUrl ?? reminder.image_url ?? null;
  if (raw == null) return null;
  const s = String(raw).trim();
  return s && /^https?:\/\//i.test(s) ? s : null;
}
