import * as React from "react";
import styles from "./SupportFab.module.css";
import SupportAgentIcon from "../plasmic/sayban/icons/SupportAgentIcon";
export type SupportFabProps = {
  onOpen?: () => void;
  hidden?: boolean;
};





/** Compact Home-header support CTA; opens the existing SupportQuickMenu. */
export default function SupportFab({ onOpen, hidden }: SupportFabProps) {
  if (hidden) return null;

  return (
    <div className={styles.supportAction}>
      <button
        type="button"
        className={styles.button}
        aria-label="پشتیبانی سریع"
        title="پشتیبانی سریع"
        onClick={() => onOpen?.()}
      >
        <span className={styles.title}>پشتیبانی سریع</span>
        <span className={styles.badge} aria-hidden>
          <SupportAgentIcon className={styles.agentIcon} />
          <span className={styles.statusDot} />
        </span>
      </button>
    </div>
  );
}
