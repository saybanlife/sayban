import * as React from "react";
import styles from "./CollapsiblePanelCard.module.css";

type CollapsiblePanelCardProps = {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  headerExtra?: React.ReactNode;
  /**
   * Hide the body with CSS instead of unmounting it. Needed when the body hosts
   * DOM owned by another React tree (see CenterPage's adopted Plasmic card),
   * which would not survive an unmount.
   */
  keepMounted?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function CollapsiblePanelCard({
  title,
  hint,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  headerExtra,
  keepMounted = false,
  children,
  className
}: CollapsiblePanelCardProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = typeof openProp === "boolean";
  const open = isControlled ? openProp : uncontrolledOpen;

  const toggle = () => {
    const next = !open;
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  return (
    <section className={`${styles.card}${className ? ` ${className}` : ""}`}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.toggle}
          onClick={toggle}
          aria-expanded={open}
          aria-label={open ? `بستن ${title}` : `باز کردن ${title}`}
        >
          <span className={styles.chevron} aria-hidden>
            {open ? "▾" : "◂"}
          </span>
        </button>
        <div className={styles.titleBlock} onClick={toggle} role="presentation">
          <h3 className={styles.title}>{title}</h3>
          {hint && open ? <p className={styles.hint}>{hint}</p> : null}
        </div>
        {headerExtra ? (
          <div className={styles.headerExtra}>{headerExtra}</div>
        ) : null}
      </div>
      {open || keepMounted ? (
        <div
          className={`${styles.body}${open ? "" : ` ${styles.bodyHidden}`}`}
          hidden={!open}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}

export default CollapsiblePanelCard;
