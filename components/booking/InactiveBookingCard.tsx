import * as React from "react";
import { useRouter } from "next/router";
import type { ReservationRecord } from "../reservation/reservationDetailsModel";
import { buildInactiveBookingCard } from "./inactiveBookingCardModel";
import styles from "./InactiveBookingCard.module.css";

export type InactiveBookingCardProps = {
  reservation: ReservationRecord;
  className?: string;
  onOpenDetails?: () => void;
};

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M14.5 5.5L8 12l6.5 6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InactiveBookingCard({
  reservation,
  className,
  onOpenDetails
}: InactiveBookingCardProps) {
  const router = useRouter();
  const model = React.useMemo(
    () => buildInactiveBookingCard(reservation),
    [reservation]
  );

  const badgeClass =
    model.badge.tone === "completed"
      ? styles.badgeCompleted
      : model.badge.tone === "expired"
        ? styles.badgeExpired
        : styles.badgeCanceled;

  const openDetails = () => {
    onOpenDetails?.();
  };

  const runAction = (
    event: React.MouseEvent,
    kind: "invoice" | "repeat"
  ) => {
    event.stopPropagation();
    if (kind === "invoice") {
      openDetails();
      return;
    }
    void router.push(model.repeatRoute);
  };

  return (
    <div
      className={[styles.card, className].filter(Boolean).join(" ")}
      role="button"
      tabIndex={0}
      onClick={openDetails}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openDetails();
        }
      }}
      data-inactive-booking={model.badge.tone}
    >
      <div className={styles.topRow}>
        <div className={styles.main}>
          <div className={styles.context}>{model.contextLabel}</div>
          <h3 className={styles.title}>{model.title}</h3>
          <div className={styles.subtitle}>
            {model.subtitle.includes("★") ? (
              <>
                {model.subtitle.split("★")[0]}
                <span className={styles.star}>★</span>
                {model.subtitle.split("★")[1]}
              </>
            ) : (
              model.subtitle
            )}
          </div>
        </div>
        <div className={styles.side}>
          <span className={`${styles.badge} ${badgeClass}`}>
            {model.badge.label}
          </span>
          <ChevronIcon className={styles.chevron} />
        </div>
      </div>
      {model.actions.length > 0 ? (
        <div className={styles.actions}>
          {model.actions.map(action => (
            <button
              key={`${action.kind}-${action.label}`}
              type="button"
              className={[
                styles.action,
                model.actions.length === 1 ? styles.actionSolo : ""
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={event => runAction(event, action.kind)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default InactiveBookingCard;
