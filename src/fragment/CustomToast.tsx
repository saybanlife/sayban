import * as React from "react";
import type { Toast } from "react-hot-toast";
import styles from "./toastStyles.module.css";

export type SaybanToastVariant = "success" | "error" | "info" | "warning";

const VARIANT_COLORS: Record<SaybanToastVariant, string> = {
  info: "#1e3a5f",
  success: "#1a4d3e",
  error: "#5c1a1a",
  warning: "#6b4a1a"
};

function InfoIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="M12 10v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="7.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path
        d="M8 12.5l2.5 2.5L16 9.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4.5 20.2 18.5H3.8L12 4.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 10v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4.5 20.2 18.5H3.8L12 4.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M12 9.5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" />
    </svg>
  );
}

const VARIANT_ICONS: Record<SaybanToastVariant, React.ReactNode> = {
  info: <InfoIcon />,
  success: <SuccessIcon />,
  error: <ErrorIcon />,
  warning: <WarningIcon />
};

export type SaybanToastProps = {
  toastItem: Toast;
  variant: SaybanToastVariant;
  title: string;
  subtitle?: string;
  fromTop?: boolean;
  onDismiss: () => void;
};

export function SaybanToast({
  toastItem,
  variant,
  title,
  subtitle,
  fromTop = false,
  onDismiss
}: SaybanToastProps) {
  const motionClass = toastItem.visible
    ? fromTop
      ? styles.enterFromTop
      : styles.enterFromBottom
    : fromTop
      ? styles.exitFromTop
      : styles.exitFromBottom;

  return (
    <div
      className={`${styles.toast} ${motionClass}`}
      style={{ backgroundColor: VARIANT_COLORS[variant] }}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        className={styles.closeBtn}
        aria-label="بستن"
        onClick={onDismiss}
      >
        <svg className={styles.closeIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <div className={styles.content}>
        <p className={styles.title}>{title}</p>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>


      <div className={styles.iconWrap}>{VARIANT_ICONS[variant]}</div>

    </div>
  );
}
