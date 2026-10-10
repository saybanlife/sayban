import * as React from "react";
import {
  PlasmicReport2,
  DefaultReport2Props
} from "./plasmic/sayban/PlasmicReport2";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import ReportItem from "./ReportItem";
import ReminderChannelCard, {
  buildChannelPriceHint
} from "./ReminderChannelCard";
import cardStyles from "./ReminderChannelCard.module.css";

export interface Report2Props extends DefaultReport2Props {}

/** API results use `type` as channel id; `value` is often numeric 0 for all rows. */
export function channelIdFromMaster(
  master: { type?: unknown; value?: unknown } | null | undefined
) {
  const type = String(master?.type ?? "").trim();
  if (type && type !== "undefined" && type !== "null") return type;
  const value = master?.value;
  if (value != null && String(value) !== "0") {
    const asText = String(value).trim();
    if (asText && asText !== "undefined" && asText !== "null") return asText;
  }
  return "";
}

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

function normalizeChannels(value: unknown): string[] {
  if (Array.isArray(value)) {
    return uniqueStrings(value.map(v => String(v)).filter(Boolean));
  }
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return uniqueStrings(parsed.map(v => String(v)).filter(Boolean));
      }
    } catch {
      /* ignore */
    }
  }
  return [];
}

function Report2_(props: Report2Props, ref: HTMLElementRefOf<"div">) {
  const [channels, setChannels] = React.useState(() =>
    normalizeChannels(props.selectchanels)
  );
  const [priceHint, setPriceHint] = React.useState("");

  React.useEffect(() => {
    setChannels(normalizeChannels(props.selectchanels));
  }, [props.selectchanels]);

  const commit = React.useCallback(
    (next: string[]) => {
      const unique = normalizeChannels(next);
      setChannels(unique);
      props.onSelectchanelsChange?.(unique as never);
    },
    [props]
  );

  const toggleChannel = React.useCallback(
    (rawValue: unknown, disabled?: boolean) => {
      if (disabled) return;
      const value = String(rawValue ?? "").trim();
      if (!value || value === "undefined" || value === "null" || value === "0") {
        return;
      }
      if (channels.includes(value)) {
        commit(channels.filter(item => item !== value));
      } else {
        commit([...channels, value]);
      }
    },
    [channels, commit]
  );

  const hostRef = React.useRef<HTMLDivElement | null>(null);

  const rememberHint = React.useCallback(
    (next: string) => {
      if (!next || next === priceHint) return;
      setPriceHint(next);
    },
    [priceHint]
  );

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      hostRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref)
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [ref]
  );

  // Prefer API totalLabel like «۳۲ عدد در ماه» from the nearby summary line when present.
  React.useEffect(() => {
    const host = hostRef.current;
    if (!host || priceHint.includes("در ")) return;
    const page = host.closest("[data-reminder-event-page]");
    const summary = page?.querySelector(
      '[class*="ProcessReminders"], [class*="processReminders"], [class*="text__sHr5"]'
    );
    const text = (summary?.textContent || "").replace(/\s+/g, " ").trim();
    const m = text.match(/(\d+|[\u06F0-\u06F9]+)[^\d\u06F0-\u06F9]{0,6}عدد\s+در\s+(ماه|سال)/);
    if (m) {
      rememberHint(`قیمت برای ${m[1]} عدد در ${m[2]} محاسبه شده است.`);
    }
  }, [priceHint, channels, rememberHint]);

  return (
    <div
      ref={setRefs}
      className={props.className}
      data-reminder-channel-list="1"
    >
      {priceHint ? (
        <p className={cardStyles.priceHint} data-reminder-channel-price-hint="1">
          {priceHint}
        </p>
      ) : null}
      <PlasmicReport2
        {...props}
        className={undefined}
        selectchanels={channels}
        onSelectchanelsChange={value => commit(normalizeChannels(value))}
        overrides={{
          ...(props as { overrides?: Record<string, unknown> }).overrides,
          reportItem: {
            render: (
              renderProps: React.ComponentProps<typeof ReportItem>,
              DefaultReportItem: typeof ReportItem
            ) => {
              const channelId = channelIdFromMaster(renderProps.master);
              const selected =
                Boolean(channelId) && channels.includes(channelId);
              const hint = buildChannelPriceHint({
                totalLabel: (
                  renderProps.apiRequestData as { totalLabel?: unknown }
                )?.totalLabel,
                count: renderProps.count
              });
              if (hint) {
                queueMicrotask(() => rememberHint(hint));
              }
              if (
                renderProps.reminder === true ||
                renderProps.reminder === "reminder"
              ) {
                return (
                  <ReminderChannelCard
                    master={renderProps.master}
                    selected={selected}
                    disabled={Boolean(renderProps.disable)}
                    onToggle={() =>
                      toggleChannel(channelId, Boolean(renderProps.disable))
                    }
                  />
                );
              }
              return (
                <DefaultReportItem
                  {...renderProps}
                  select={selected}
                  onClick={() =>
                    toggleChannel(channelId, Boolean(renderProps.disable))
                  }
                />
              );
            }
          }
        }}
      />
    </div>
  );
}

const Report2 = React.forwardRef(Report2_);
export default Report2;
