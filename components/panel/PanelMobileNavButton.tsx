import * as React from "react";
import { requestPanelNavToggle } from "./panelSidebarMode";
import styles from "./PanelMobileNavButton.module.css";

export default function PanelMobileNavButton() {
  return (
    <button
      type="button"
      className={styles.menuBtn}
      aria-label="باز و بسته کردن منوی پنل"
      onClick={() => requestPanelNavToggle()}
    >
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}
