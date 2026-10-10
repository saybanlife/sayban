import * as React from "react";
import styles from "./ServiceHoursNotice.module.css";

export interface ServiceHoursNoticeProps {
  className?: string;
}

export default function ServiceHoursNotice({ className }: ServiceHoursNoticeProps) {
  return (
    <div className={[styles.card, className].filter(Boolean).join(" ")}>
      <div className={styles.iconCol}>
        <div className={styles.clock}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M12 7v5l3.2 2"></path>
          </svg>
        </div>
      </div>

      <p className={styles.text}>
        خدمات <strong>روزانه</strong> به فعالیت در ساعات اداری (صبح تا عصر) اشاره دارد، در حالی
        که خدمات <strong>شبانه‌روزی</strong> ۲۴ ساعته در دسترس هستند.
      </p>
    </div>
  );
}
