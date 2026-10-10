import * as React from "react";
import {
  pickTodayReminders,
  pickUpcomingReminders,
  type ReminderHomeItem
} from "./reminderHomeModel";
import { requestReminderDetail } from "@/lib/reminderTask";
import styles from "./ReminderHomeBoard.module.css";

export type ReminderHomeBoardProps = {
  data?: unknown;
  onAddClick?: () => void;
};

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden focusable="false">
      <circle
        cx="12"
        cy="12"
        r="8.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 8.2V12l2.6 1.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PillIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.15em" height="1.15em" aria-hidden focusable="false">
      <rect
        x="4.5"
        y="9"
        width="15"
        height="6"
        rx="3"
        transform="rotate(-35 12 12)"
        fill="currentColor"
      />
      <path
        d="M10.2 8.4 13.8 15.6"
        stroke="#fff8d6"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden focusable="false">
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8.2 12.2 11 15l4.8-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function openReminder(item: ReminderHomeItem) {
  requestReminderDetail(item.raw);
}

export default function ReminderHomeBoard({
  data,
  onAddClick
}: ReminderHomeBoardProps) {
  const today = React.useMemo(() => pickTodayReminders(data), [data]);
  const upcoming = React.useMemo(() => pickUpcomingReminders(data), [data]);

  return (
    <div className={styles.board} data-reminder-home-board="1">
      {upcoming.length > 0 ? (
        <section className={styles.section} aria-label="یادآوری‌های پیش رو">
          <h2 className={styles.sectionTitle}>یادآوری‌های پیش رو</h2>
          <div className={styles.upcomingList}>
            {upcoming.map(item => (
              <button
                key={`up-${item.id}`}
                type="button"
                className={styles.upcomingCard}
                onClick={() => openReminder(item)}
              >
                <div className={styles.upcomingDate}>
                  <span className={styles.upcomingDay}>{item.dayFa || "—"}</span>
                  <span className={styles.upcomingMonth}>
                    {item.monthFa || "مناسبت"}
                  </span>
                </div>
                <div className={styles.upcomingBody}>
                  <div className={styles.upcomingTitle}>
                    {item.isOccasion ? "مناسبت" : item.title}
                  </div>
                  {item.timeShort ? (
                    <span className={styles.timePill}>{item.timeShort}</span>
                  ) : null}
                </div>
                <span className={styles.upcomingDecor} aria-hidden />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.section} aria-label="یادآوری‌های امروز">
        <h2 className={styles.sectionTitle}>یادآوری‌های امروز</h2>
        {today.length === 0 ? (
          <button
            type="button"
            className={styles.emptyToday}
            onClick={onAddClick}
          >
            برای امروز یادآوری ندارید
            <span>ثبت یادآوری جدید</span>
          </button>
        ) : (
          <div className={styles.todayList}>
            {today.map(item => (
              <button
                key={`td-${item.id}`}
                type="button"
                className={styles.todayCard}
                onClick={() => openReminder(item)}
              >
                <span className={styles.todayIcon} aria-hidden>
                  {item.imageUrl ? (
                    <img
                      className={styles.todayThumb}
                      src={item.imageUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <PillIcon />
                  )}
                </span>
                <span className={styles.todayTitle}>{item.title}</span>
                {item.timeShort ? (
                  <span className={styles.timePill}>
                    <ClockIcon />
                    {item.timeShort}
                  </span>
                ) : null}
                <span className={styles.check} aria-hidden>
                  <CheckIcon />
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
