import * as React from "react";
import { useRouter } from "next/router";

import type { ReservationRecord } from "./reservationDetailsModel";
import {
  buildVisitPostVisitSteps,
  visitAwaitingCenterReview,
  visitAwaitingContractAnswer,
  visitNeedsPostVisitHomeStatus,
  visitPostVisitStepCaption
} from "./visitPostVisitModel";
import styles from "./ReservationVisitPostVisitDetails.module.css";

type Props = {
  reservation: ReservationRecord;
  token?: string;
  busy?: boolean;
  onChange: (reservation: ReservationRecord) => void;
};

function Progress({ reservation }: { reservation: ReservationRecord }) {
  const steps = buildVisitPostVisitSteps(reservation);
  const caption = visitPostVisitStepCaption(reservation);
  return (
    <div className={styles.progressBlock}>
      <div className={styles.progress}>
        {steps.map(step => (
          <span
            key={step.key}
            className={[
              styles.seg,
              step.done && !step.current ? styles.segDone : "",
              step.current ? styles.segCurrent : ""
            ]
              .filter(Boolean)
              .join(" ")}
          />
        ))}
      </div>
      <div className={styles.progressCaption}>{caption}</div>
    </div>
  );
}

export default function ReservationVisitPostVisitDetails({
  reservation,
  token,
  busy,
  onChange
}: Props) {
  const router = useRouter();
  if (!visitNeedsPostVisitHomeStatus(reservation)) return null;

  const center = String(reservation.center_name || "مرکز").trim();

  const act = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/reservations/visit-contract-feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        reservation_id: reservation.id,
        contractSigned: body.contractSigned,
        declineReason: body.declineReason,
        supportRequested: body.supportRequested
      })
    });
    const payload = await response.json().catch(() => null);
    if (response.ok && payload?.result) {
      onChange(payload.result as ReservationRecord);
    }
  };

  const openReview = (signed?: boolean) => {
    const q = signed === false ? "?signed=0" : signed ? "?signed=1" : "";
    void router.push(`/reservation-center-review/${reservation.id}${q}`);
  };

  if (visitAwaitingContractAnswer(reservation)) {
    return (
      <section className={`${styles.card} ${styles.actionCard}`}>
        <span className={styles.badge}>منتظر اقدام شما</span>
        <h2>آیا با «{center}» قرارداد بستید؟</h2>
        <p>خبر شما را منتظریم.</p>
        <Progress reservation={reservation} />
        <div className={styles.row}>
          <button
            type="button"
            className={styles.secondary}
            disabled={busy}
            onClick={() => openReview(false)}
          >
            هنوز نه
          </button>
          <button
            type="button"
            className={styles.primary}
            disabled={busy}
            onClick={async () => {
              await act({
                action: "visit_contract_feedback",
                contractSigned: true
              });
              openReview(true);
            }}
          >
            ✓ بله، قرارداد بستم
          </button>
        </div>
        <div className={styles.notice}>
          ⓘ با اطلاع‌دادن به ما، می‌توانیم کیفیت خدمت را پایش کنیم و ضمانت‌های
          سایبان را برای شما فعال کنیم.
        </div>
      </section>
    );
  }

  if (visitAwaitingCenterReview(reservation)) {
    return (
      <section className={`${styles.card} ${styles.actionCard}`}>
        <span className={styles.badge}>ثبت نظر</span>
        <h2>نظر شما درباره {center}</h2>
        <p>تجربه ورود و تعامل مرکز تا زمان قرارداد.</p>
        <Progress reservation={reservation} />
        <button
          type="button"
          className={styles.primaryWide}
          disabled={busy}
          onClick={() => openReview()}
        >
          ثبت نظر
        </button>
      </section>
    );
  }

  return null;
}
