import * as React from "react";
import styles from "./SupportFab.module.css";
import SupportAgentIcon from "../plasmic/sayban/icons/SupportAgentIcon";
export type SupportFabProps = {
  onOpen: () => void;
  hidden?: boolean;
};





/** Floating support CTA — Home landing only; opens SupportQuickMenu. */
export default function SupportFab({ onOpen, hidden }: SupportFabProps) {
  if (hidden) return null;

  return (
    <div className={styles.fab}>
      <button
        type="button"
        className={styles.button}
        aria-label="پشتیبانی سریع"
        title="پشتیبانی سریع"
        onClick={onOpen}
      >
        <span className={styles.pill}>
          <span className={styles.copy}>
            <span className={styles.titleRow}>
              <span className={styles.statusDot} aria-hidden />
              <span className={styles.title}>پشتیبانی سریع</span>
            </span>
            <span className={styles.subtitle}>همیشه کنار شما هستیم</span>
          </span>
        </span>

        <span className={styles.badge} aria-hidden>
          <span className={styles.sparkles}>
            <span />
            <span />
            <span />
          </span>
          <span className={styles.badgeRing}>
            <span className={styles.badgeCore}>
              <SupportAgentIcon className={styles.agentIcon} />
            </span>
          </span>
        </span>
      </button>
    </div>
  );
}
