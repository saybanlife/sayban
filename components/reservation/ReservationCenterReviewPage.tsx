import * as React from "react";
import { useRouter } from "next/router";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";

import Header from "../Header";
import { readCookie } from "../../src/lib/authCookies";
import { goBackOrReplace } from "../navigation/backNavigation";
import type { ReservationRecord } from "./reservationDetailsModel";
import {
  buildCenterReviewSubmitBody,
  centerReviewTitle,
  isSignedContractReview,
  signedReviewIntro,
  unsignedReviewIntro,
  validateCenterReviewForm,
  VISIT_NO_CONTRACT_REASONS,
  type CenterReviewFormState
} from "./reservationCenterReviewModel";
import styles from "./ReservationCenterReviewPage.module.css";

type Props = {
  reservationId: string;
  onBack?: () => void;
};

function readToken() {
  return readCookie("token") || "";
}

function StarRow({
  value,
  onChange
}: {
  value: number;
  onChange: (rate: number) => void;
}) {
  return (
    <div className={styles.stars} role="radiogroup" aria-label="امتیاز">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className={star <= value ? styles.starOn : styles.star}
          aria-checked={star === value}
          role="radio"
          onClick={() => onChange(star)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function ReservationCenterReviewPage({
  reservationId,
  onBack
}: Props) {
  const router = useRouter();
  const $globalActions = useGlobalActions?.();
  const toast = React.useCallback(
    (type: "error" | "success", message: string) => {
      $globalActions?.["Fragment.showToast"]?.(type, message, "bottom-center");
    },
    [$globalActions]
  );

  const [reservation, setReservation] = React.useState<ReservationRecord | null>(
    null
  );
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState("");
  const [form, setForm] = React.useState<CenterReviewFormState>({
    rating: 0,
    publicComment: "",
    privateComment: "",
    declineReason: "",
    requestSupport: false
  });

  const signed = isSignedContractReview(
    reservation,
    typeof router.query.signed === "string" ? router.query.signed : null
  );

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const token = readToken();
        const response = await fetch(
          `/api/reservations/details-enriched?id=${encodeURIComponent(reservationId)}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            cache: "no-store"
          }
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.result) {
          throw new Error("load-failed");
        }
        if (!cancelled) setReservation(payload.result as ReservationRecord);
      } catch {
        if (!cancelled) setError("بارگذاری رزرو ناموفق بود.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reservationId]);

  const back = () => {
    if (onBack) {
      onBack();
      return;
    }
    goBackOrReplace(router, "/home/");
  };

  const submit = async () => {
    if (!reservation) return;
    const validation = validateCenterReviewForm(form, signed);
    if (validation) {
      setError(validation);
      toast("error", validation);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const token = readToken();
      if (!signed) {
        await fetch("/api/reservations/visit-contract-feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            reservation_id: reservationId,
            contractSigned: false,
            declineReason: form.declineReason,
            supportRequested: form.requestSupport
          })
        });
      }
      const body = buildCenterReviewSubmitBody({
        reservation,
        state: form,
        signed
      });
      const response = await fetch(
        `/api/reservations/${reservationId}/center-review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            ...body,
            contract_signed: signed,
            decline_reason: signed ? null : form.declineReason,
            support_requested: form.requestSupport
          })
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "submit-failed");
      }
      toast("success", "نظر شما ثبت شد.");
      back();
    } catch {
      setError("ثبت نظر انجام نشد. دوباره تلاش کنید.");
      toast("error", "ثبت نظر انجام نشد.");
    } finally {
      setSubmitting(false);
    }
  };

  const title = centerReviewTitle(reservation);

  return (
    <div className={styles.root}>
      <Header slot={title} search={false} back={back} runCode />
      <main className={styles.body}>
        {loading ? <p className={styles.muted}>در حال بارگذاری…</p> : null}
        {error && !loading ? <p className={styles.error}>{error}</p> : null}
        {!loading && reservation ? (
          <>
            <div className={styles.intro}>
              {signed ? signedReviewIntro() : unsignedReviewIntro()}
            </div>

            {!signed ? (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>چرا قرارداد نبستید؟</h2>
                <div className={styles.chips}>
                  {VISIT_NO_CONTRACT_REASONS.map(reason => (
                    <button
                      key={reason}
                      type="button"
                      className={
                        form.declineReason === reason
                          ? styles.chipOn
                          : styles.chip
                      }
                      onClick={() =>
                        setForm(prev => ({ ...prev, declineReason: reason }))
                      }
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <span>امتیاز شما به {reservation.center_name || "مرکز"}</span>
              </div>
              <StarRow
                value={form.rating}
                onChange={rating => setForm(prev => ({ ...prev, rating }))}
              />
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>نظر برای نمایش عمومی</h2>
              <p className={styles.hint}>
                بدون نام شما در صفحه مرکز دیده می‌شود.
              </p>
              <textarea
                className={styles.textarea}
                rows={4}
                placeholder="مثلاً: مرکز زود جواب داد و شفاف بود…"
                value={form.publicComment}
                onChange={event =>
                  setForm(prev => ({
                    ...prev,
                    publicComment: event.target.value
                  }))
                }
              />
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>نظر شخصی</h2>
              <p className={styles.hint}>
                فقط برای شما و سایبان ثبت می‌شود.
              </p>
              <textarea
                className={styles.textarea}
                rows={4}
                placeholder="هر چیزی که فقط می‌خواهید ما بدانیم…"
                value={form.privateComment}
                onChange={event =>
                  setForm(prev => ({
                    ...prev,
                    privateComment: event.target.value
                  }))
                }
              />
            </section>

            {!signed ? (
              <label className={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={form.requestSupport}
                  onChange={event =>
                    setForm(prev => ({
                      ...prev,
                      requestSupport: event.target.checked
                    }))
                  }
                />
                <span>می‌خواهم پشتیبان با من تماس بگیرد</span>
              </label>
            ) : null}

            <button
              type="button"
              className={styles.submit}
              disabled={submitting}
              onClick={() => void submit()}
            >
              ثبت نظر
            </button>
          </>
        ) : null}
      </main>
    </div>
  );
}
