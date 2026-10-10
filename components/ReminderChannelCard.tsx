import * as React from "react";
import { toPersianDigits } from "@/lib/datetime";
import styles from "./ReminderChannelCard.module.css";

export type ReminderChannelMaster = {
  type?: unknown;
  name?: unknown;
  value?: unknown;
  price?: unknown;
  priceLabel?: unknown;
  icon_path?: unknown;
};

type ReminderChannelCardProps = {
  master?: ReminderChannelMaster | null;
  selected?: boolean;
  disabled?: boolean;
  onToggle?: () => void;
  className?: string;
};

const TYPE_NAME: Record<string, string> = {
  notification: "نوتیفیکیشن/اپ",
  sms: "پیامک",
  bale: "بله",
  telegram: "تلگرام"
};

function channelKey(master?: ReminderChannelMaster | null): string {
  const type = String(master?.type ?? "").trim().toLowerCase();
  if (type && type !== "undefined" && type !== "null") return type;
  const value = String(master?.value ?? "").trim().toLowerCase();
  if (value && value !== "0" && value !== "undefined" && value !== "null") {
    return value;
  }
  return "";
}

function channelTitle(master?: ReminderChannelMaster | null): string {
  const name = String(master?.name ?? "").trim();
  if (name) return name;
  const key = channelKey(master);
  return TYPE_NAME[key] || key || "روش ارسال";
}

function channelPrice(master?: ReminderChannelMaster | null): {
  free: boolean;
  label: string;
} {
  const priceLabel = String(master?.priceLabel ?? "").trim();
  if (priceLabel) {
    const free =
      /رایگان/.test(priceLabel) || Number(master?.price) === 0;
    return { free, label: priceLabel };
  }
  const priceNum = Number(master?.price);
  if (Number.isFinite(priceNum)) {
    if (priceNum === 0) return { free: true, label: "رایگان" };
    return {
      free: false,
      label: `${toPersianDigits(priceNum)} ریال`
    };
  }
  // Match legacy Plasmic: Number(value) === 0 → رایگان
  if (Number(master?.value) === 0) return { free: true, label: "رایگان" };
  const raw = master?.value;
  if (raw != null && String(raw).trim() !== "") {
    return { free: false, label: `${raw} ریال` };
  }
  return { free: false, label: "" };
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 4.2 1.4 5.5 1.4 5.5H5.1S6.5 13.7 6.5 9.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M10 18.2a2 2 0 0 0 4 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SmsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d="M4.2 18.5 7 14.8l9.2-1.3L20 5.5 4.2 18.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m7 14.8 2.8 3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BaleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden focusable="false">
      <circle
        cx="12"
        cy="12"
        r="8.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m8.2 12.2 2.6 2.6 5-5.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        d="M5.5 7.5h13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9.2 7.5V6.2A1.2 1.2 0 0 1 10.4 5h3.2a1.2 1.2 0 0 1 1.2 1.2v1.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8 7.5h8l-.7 11.2a1.4 1.4 0 0 1-1.4 1.3H10a1.4 1.4 0 0 1-1.4-1.3L8 7.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChannelGlyph({ type }: { type: string }) {
  if (type === "sms") {
    return <SmsIcon className={styles.icon} />;
  }
  if (type === "bale" || type === "telegram") {
    return <BaleIcon className={styles.icon} />;
  }
  return <BellIcon className={styles.icon} />;
}

function iconColor(type: string): string {
  if (type === "sms") return "#2B9BE8";
  if (type === "bale" || type === "telegram") return "#2BB48A";
  return "#F2B805";
}

export function buildChannelPriceHint(args: {
  totalLabel?: unknown;
  count?: unknown;
}): string {
  const label = String(args.totalLabel ?? "").trim();
  if (label && label !== "undefined") {
    return `قیمت برای ${label} محاسبه شده است.`;
  }
  const count = Number(args.count);
  if (Number.isFinite(count) && count > 0) {
    return `قیمت برای ${toPersianDigits(count)} عدد محاسبه شده است.`;
  }
  return "";
}

export default function ReminderChannelCard({
  master,
  selected = false,
  disabled = false,
  onToggle,
  className
}: ReminderChannelCardProps) {
  const type = channelKey(master);
  const title = channelTitle(master);
  const price = channelPrice(master);

  return (
    <div
      className={[styles.card, className].filter(Boolean).join(" ")}
      data-reminder-channel-card="1"
      data-channel={type || undefined}
      data-selected={selected ? "1" : "0"}
      data-disabled={disabled ? "1" : "0"}
    >
      <div className={styles.iconWrap} style={{ color: iconColor(type) }}>
        <ChannelGlyph type={type} />
      </div>
      <div className={styles.mid}>
        <div className={styles.name}>{title}</div>
        {price.free ? (
          <span className={styles.freeChip}>رایگان</span>
        ) : price.label ? (
          <span className={styles.priceText}>{price.label}</span>
        ) : null}
      </div>
      {selected ? (
        <button
          type="button"
          className={styles.actionRemove}
          aria-label={`حذف ${title}`}
          disabled={disabled}
          onClick={event => {
            event.stopPropagation();
            if (!disabled) onToggle?.();
          }}
        >
          <TrashIcon className={styles.trash} />
        </button>
      ) : (
        <button
          type="button"
          className={styles.actionAdd}
          disabled={disabled}
          onClick={event => {
            event.stopPropagation();
            if (!disabled) onToggle?.();
          }}
        >
          + افزودن
        </button>
      )}
    </div>
  );
}
