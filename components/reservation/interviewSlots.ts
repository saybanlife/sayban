import type { InterviewOption } from "./reservationDetailsModel";
import { parseInterviewOptions } from "./reservationDetailsModel";
import {
  parseDate,
  parseTime,
  toPersianDigits,
  type DateValue,
  type TimeValue
} from "@/lib/datetime";

export type InterviewSlotDraft = {
  id: string;
  date: DateValue;
  time: TimeValue;
  /** Minutes; default 30. */
  durationMinutes?: number;
};

const WEEKDAYS_FA = [
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
  "شنبه"
] as const;

const DEFAULT_MODES: InterviewOption["modes"] = ["online", "home", "center"];

export function newSlotDraft(
  partial?: Partial<InterviewSlotDraft>
): InterviewSlotDraft {
  return {
    id: partial?.id || `slot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: partial?.date || "",
    time: partial?.time || "",
    durationMinutes: partial?.durationMinutes ?? 30
  };
}

/** Wall-clock local datetime without timezone suffix: `YYYY-MM-DDTHH:mm:ss`. */
export function combineLocalDateTime(date: DateValue, time: TimeValue): string {
  const d = parseDate(date);
  const t = parseTime(time);
  if (!d || !t) return "";
  return `${d}T${t}:00`;
}

export function addMinutesLocal(
  date: DateValue,
  time: TimeValue,
  minutes: number
): string {
  const start = combineLocalDateTime(date, time);
  if (!start) return "";
  const [dPart, tPart] = start.split("T");
  const [y, m, day] = dPart.split("-").map(Number);
  const [hh, mm] = tPart.replace(/:00$/, "").split(":").map(Number);
  const dt = new Date(y!, m! - 1, day!, hh!, mm!, 0);
  dt.setMinutes(dt.getMinutes() + minutes);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}:00`;
}

export function draftsToInterviewOptions(
  drafts: InterviewSlotDraft[],
  modes: InterviewOption["modes"] = DEFAULT_MODES
): InterviewOption[] {
  const options: InterviewOption[] = [];
  for (const draft of drafts) {
    const starts_at = combineLocalDateTime(draft.date, draft.time);
    if (!starts_at) continue;
    const duration = Math.max(15, Number(draft.durationMinutes) || 30);
    options.push({
      starts_at,
      ends_at: addMinutesLocal(draft.date, draft.time, duration),
      modes: modes?.length ? [...modes] : [...DEFAULT_MODES!]
    });
  }
  return options;
}

export function interviewOptionsToDrafts(
  value: string | InterviewOption[] | null | undefined
): InterviewSlotDraft[] {
  const options = parseInterviewOptions(value);
  if (!options.length) return [newSlotDraft()];
  return options.map((option, index) => {
    const raw = String(option.starts_at || "").replace(" ", "T");
    const [datePart, timePart = ""] = raw.split("T");
    const time = parseTime(timePart.slice(0, 5));
    let durationMinutes = 30;
    if (option.ends_at) {
      const startMs = Date.parse(option.starts_at.replace(" ", "T"));
      const endMs = Date.parse(String(option.ends_at).replace(" ", "T"));
      if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
        durationMinutes = Math.round((endMs - startMs) / 60000);
      }
    }
    return newSlotDraft({
      id: `existing-${index}-${datePart}-${time}`,
      date: parseDate(datePart),
      time,
      durationMinutes
    });
  });
}

function parseLocalParts(value?: string | null) {
  if (!value) return null;
  const normalized = String(value).trim().replace(" ", "T");
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?/
  );
  if (!match) {
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) return null;
    return {
      y: date.getFullYear(),
      m: date.getMonth() + 1,
      d: date.getDate(),
      hh: date.getHours(),
      mm: date.getMinutes(),
      weekday: date.getDay()
    };
  }
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const hh = Number(match[4]);
  const mm = Number(match[5]);
  const weekday = new Date(y, m - 1, d).getDay();
  return { y, m, d, hh, mm, weekday };
}

/** «شنبه ۱۱ مهر» using Persian calendar via Intl. */
export function formatInterviewSlotDay(value?: string | null): string {
  const parts = parseLocalParts(value);
  if (!parts) return "";
  try {
    const date = new Date(parts.y, parts.m - 1, parts.d, parts.hh, parts.mm);
    const weekday = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      weekday: "long"
    }).format(date);
    const day = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      day: "numeric"
    }).format(date);
    const month = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      month: "long"
    }).format(date);
    return `${weekday} ${day} ${month}`;
  } catch {
    const weekday = WEEKDAYS_FA[parts.weekday] || "";
    return toPersianDigits(`${weekday} ${parts.d}/${parts.m}`);
  }
}

export function formatInterviewClock(value?: string | null): string {
  const parts = parseLocalParts(value);
  if (!parts) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return toPersianDigits(`${pad(parts.hh)}:${pad(parts.mm)}`);
}

/** «۱۰ تا ۱۰:۳۰» */
export function formatInterviewSlotRange(
  startsAt?: string | null,
  endsAt?: string | null
): string {
  const start = formatInterviewClock(startsAt);
  if (!start) return "";
  if (!endsAt) return start;
  const end = formatInterviewClock(endsAt);
  if (!end) return start;
  return `${start} تا ${end}`;
}

export function coerceInterviewOptionsFromOffer(
  row:
    | {
        interview_options?: unknown;
        offer_proposed_slots?: unknown;
        offer_proposed_date?: unknown;
        offer_proposed_time?: unknown;
        proposed_slots?: unknown;
        proposed_date?: unknown;
        proposed_time?: unknown;
        [key: string]: unknown;
      }
    | null
    | undefined
): InterviewOption[] {
  if (!row) return [];
  const fromLifecycle = parseInterviewOptions(
    row.interview_options as string | InterviewOption[] | null
  );
  if (fromLifecycle.length) return fromLifecycle;

  const fromOfferSlots = parseInterviewOptions(
    (row.offer_proposed_slots ?? row.proposed_slots) as
      | string
      | InterviewOption[]
      | null
  );
  if (fromOfferSlots.length) return fromOfferSlots;

  const date = parseDate(row.offer_proposed_date ?? row.proposed_date);
  const time = parseTime(row.offer_proposed_time ?? row.proposed_time);
  if (!date || !time) return [];
  return [
    {
      starts_at: combineLocalDateTime(date, time),
      ends_at: addMinutesLocal(date, time, 30),
      modes: [...DEFAULT_MODES!]
    }
  ];
}

export { DEFAULT_MODES };
