import * as React from "react";
import {
  PlasmicReport2,
  DefaultReport2Props
} from "./plasmic/sayban/PlasmicReport2";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import ReportItem from "./ReportItem";

export interface Report2Props extends DefaultReport2Props {}

/** API results use `type` as channel id; `value` is often numeric 0 for all rows. */
export function channelIdFromMaster(master: { type?: unknown; value?: unknown } | null | undefined) {
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

  return (
    <PlasmicReport2
      root={{ ref }}
      {...props}
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
            const selected = Boolean(channelId) && channels.includes(channelId);
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
  );
}

const Report2 = React.forwardRef(Report2_);
export default Report2;
