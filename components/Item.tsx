import * as React from "react";
import { PlasmicItem, DefaultItemProps } from "./plasmic/sayban/PlasmicItem";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import styles from "./centers/CenterTypeBadge.module.css";

export interface ItemProps extends DefaultItemProps {}

type CenterTypeKind = "night" | "day" | "all" | "";

function resolveCenterTypeKind(item: DefaultItemProps["item"]): CenterTypeKind {
  if (!item || typeof item !== "object") return "";
  const raw = String((item as Record<string, unknown>).center_type || "")
    .trim()
    .toLowerCase();
  if (!raw) return "";
  if (raw === "residential" || raw.includes("شبانه")) return "night";
  if (raw === "day_care" || raw.includes("روزانه")) return "day";
  if (raw === "comprehensive" || raw.includes("جامع")) return "all";
  return "all";
}

function centerTypeTone(kind: CenterTypeKind): string {
  if (kind === "night") return styles.toneNight;
  if (kind === "day") return styles.toneDay;
  return styles.toneAll;
}

// Moon icon (شبانه‌روزی / residential)
function MoonIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 1020.354 15.354z"
        fill="currentColor"
      />
    </svg>
  );
}

// Sun icon (روزانه / day_care)
function SunIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CenterTypeIcon({ kind }: { kind: CenterTypeKind }) {
  if (kind === "night") return <MoonIcon />;
  if (kind === "day") return <SunIcon />;
  if (kind === "all")
    return (
      <span className={styles.iconGroup}>
        <SunIcon />
        <MoonIcon />
      </span>
    );
  return null;
}

function Item_(props: ItemProps, ref: HTMLElementRefOf<"div">) {
  const kind = resolveCenterTypeKind(props.item);
  const { className, ...rest } = props;

  return (
    <div className={[styles.wrap, className].filter(Boolean).join(" ")}>
      <PlasmicItem root={{ ref }} {...rest} />
      {kind ? (
        <span className={`${styles.badge} ${centerTypeTone(kind)}`}>
          <CenterTypeIcon kind={kind} />
        </span>
      ) : null}
    </div>
  );
}

const Item = React.forwardRef(Item_);
export default Item;