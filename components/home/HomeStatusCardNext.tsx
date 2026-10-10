import * as React from "react";
import { useRouter } from "next/router";
import type { ReservationRecord } from "../reservation/reservationDetailsModel";
import { reservationLifecycleUrl } from "../reservation/reservationLifecycleApi";
import { reservationReviewPath } from "../reservation/visitPostVisitModel";
import { buildHomeStatusCardWithVisitPostVisit } from "./homeStatusCardVisitPostVisit";
import styles from "./HomeStatusCard.module.css";

export type HomeStatusCardNextProps = {
  reservation: ReservationRecord;
  className?: string;
  token?: string;
  onOpenDetails?: () => void;
  onPay?: () => void;
  onChange?: (reservation: ReservationRecord) => void;
};

function ProgressBar({
  steps,
  caption
}: {
  steps: ReturnType<typeof buildHomeStatusCardWithVisitPostVisit>["steps"];
  caption: string;
}) {
  return (
    <div className={styles.progressBlock}>
      <div className={styles.progress} aria-label="مراحل رزرو">
        {steps.map(step => (
          <div
            key={step.key}
            title={step.label}
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
      {caption ? <div className={styles.progressCaption}>{caption}</div> : null}
    </div>
  );
}

export default function HomeStatusCardNext({
  reservation,
  className,
  token,
  onOpenDetails,
  onPay,
  onChange
}: HomeStatusCardNextProps) {
  const router = useRouter();
  const pageBase =
    typeof router.query.page === "string" && router.query.page
      ? router.query.page
      : "home";

  const model = React.useMemo(
    () => buildHomeStatusCardWithVisitPostVisit(reservation),
    [reservation]
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const act = React.useCallback(
    async (body: Record<string, unknown>) => {
      if (!reservation.id || busy) return;
      setBusy(true);
      setError("");
      try {
        const isVisitContract = body.action === "visit_contract_feedback";
        const response = await fetch(
          isVisitContract
            ? "/api/reservations/visit-contract-feedback"
            : reservationLifecycleUrl(),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify(
              isVisitContract
                ? {
                    reservation_id: reservation.id,
                    contractSigned: body.contractSigned,
                    declineReason: body.declineReason,
                    supportRequested: body.supportRequested
                  }
                : { ...body, reservation_id: reservation.id }
            )
          }
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
          throw new Error("action-failed");
        }
        onChange?.(payload.result as ReservationRecord);
      } catch {
        setError("انجام این عملیات ممکن نشد. دوباره تلاش کنید.");
      } finally {
        setBusy(false);
      }
    },
    [busy, onChange, reservation.id, token]
  );

  const openReview = React.useCallback(
    (signed?: boolean) => {
      if (!reservation.id) return;
      void router.push(reservationReviewPath(pageBase, reservation.id, { signed }));
    },
    [pageBase, reservation.id, router]
  );

  const runTarget = React.useCallback(
    (
      target:
        | "details"
        | "offers"
        | "pay"
        | "call_center"
        | "select_interview"
        | "center_review"
        | "support_callback"
    ) => {
      if (target === "support_callback") {
        window.dispatchEvent(new CustomEvent("sayban:open-support-menu"));
        return;
      }
      if (target === "center_review") {
        openReview();
        return;
      }
      if (target === "call_center") {
        const phone = String(reservation.center_phone || "").trim();
        if (phone) window.location.href = `tel:${phone}`;
        return;
      }
      if (target === "pay") {
        onPay?.();
        return;
      }
      onOpenDetails?.();
    },
    [onOpenDetails, onPay, openReview, reservation.center_phone]
  );

  const runSplit = React.useCallback(
    async (
      action:
        | "report_missed"
        | "report_attended"
        | "trial_stop"
        | "trial_continue"
        | "visit_contract_yes"
        | "visit_contract_no"
    ) => {
      if (action === "visit_contract_yes") {
        await act({
          action: "visit_contract_feedback",
          contractSigned: true
        });
        openReview(true);
        return;
      }
      if (action === "visit_contract_no") {
        openReview(false);
        return;
      }
      if (action === "report_missed") {
        void act({ action: "report_attendance", attended: false });
        return;
      }
      if (action === "report_attended") {
        void act({ action: "report_attendance", attended: true });
        return;
      }
      if (action === "trial_stop") {
        void act({ action: "trial_decision", decision: "stop" });
        return;
      }
      void act({ action: "trial_decision", decision: "continue" });
    },
    [act, openReview]
  );

  const badgeClass =
    model.badge.tone === "action"
      ? styles.badgeAction
      : model.badge.tone === "success"
        ? styles.badgeSuccess
        : styles.badgeInfo;

  return (
    <article
      className={[
        styles.card,
        model.needsAction ? styles.cardAction : "",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.topRow}>
        <span className={styles.context}>{model.contextLabel}</span>
        <span className={badgeClass}>{model.badge.label}</span>
      </div>

      <div className={styles.main}>
        {model.staffInitial ? (
          <span className={styles.avatar} aria-hidden>
            {model.staffInitial}
          </span>
        ) : null}
        <div className={styles.textCol}>
          <h3 className={styles.title}>{model.title}</h3>
          {model.highlight ? (
            <p className={styles.highlight}>{model.highlight}</p>
          ) : null}
          {model.subtitle ? (
            <p className={styles.subtitle}>{model.subtitle}</p>
          ) : null}
        </div>
      </div>

      <ProgressBar steps={model.steps} caption={model.stepCaption} />

      {model.actions.length ? (
        <div className={styles.actions}>
          {model.actions.map((action, index) => {
            if (action.kind === "split") {
              return (
                <div key={`split-${index}`} className={styles.splitRow}>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={busy}
                    onClick={() => void runSplit(action.left.action as any)}
                  >
                    {action.left.label}
                  </button>
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    disabled={busy}
                    onClick={() => void runSplit(action.right.action as any)}
                  >
                    {action.right.checkmark ? "✓ " : ""}
                    {action.right.label}
                  </button>
                </div>
              );
            }

            if (action.kind === "link") {
              return (
                <button
                  key={`${action.target}-${action.label}`}
                  type="button"
                  className={styles.linkBtn}
                  disabled={busy}
                  onClick={() => runTarget(action.target as any)}
                >
                  {action.label}
                  <span aria-hidden>‹</span>
                </button>
              );
            }

            if (action.kind === "outlined") {
              return (
                <button
                  key={`${action.target}-${action.label}`}
                  type="button"
                  className={styles.outlinedBtn}
                  disabled={busy}
                  onClick={() => runTarget(action.target as any)}
                >
                  {action.label}
                </button>
              );
            }

            return (
              <button
                key={`${action.target}-${action.label}`}
                type="button"
                className={styles.primaryBtn}
                disabled={busy}
                onClick={() => runTarget(action.target as any)}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {model.notice ? (
        <div className={styles.notice}>
          <span aria-hidden>ⓘ</span>
          <span>{model.notice}</span>
        </div>
      ) : null}

      {error ? <p className={styles.error}>{error}</p> : null}
    </article>
  );
}
