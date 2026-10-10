import * as React from "react";
import styles from "./ServiceHoursNotice.module.css";

export interface ServiceHoursNoticeProps2 {
  className?: string;
}

export default function ServiceHoursNotice2({ className }: ServiceHoursNoticeProps2) {
  return (
    <div className={[styles.card, className].filter(Boolean).join(" ")}>
      <div className={styles.iconCol}>
        <div className={styles.clock}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M12 8v8M8 12h8"></path>
          </svg>
        </div>
      </div>

      <p className={styles.text}>
        <strong>مراقب</strong> یعنی همراهانی که تخصص پزشکی و پرستاری ندارند و برای خدمات عمومی و
        روزمره مناسب هستند. <strong>پرستار</strong> یعنی افرادی که تخصص و مهارت پرستاری دارند و
        مناسب خدماتی از جمله تزریقات و... هستند.
      </p>
    </div>
  );
}