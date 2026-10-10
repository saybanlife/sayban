import * as React from "react";
import { useRouter } from "next/router";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import {
  APPROVAL_STATUS_LABELS,
  fetchCenterRegistration,
  setCenterApprovalStatus,
  type CenterRegistrationDossier
} from "./centerApproval";
import { OWNER_DOCS_LABELS } from "./centerOwnerInfo";
import { navigateToCentersList } from "@/lib/panelCenterNavigation";
import styles from "./CenterRegistrationReview.module.css";

export type CenterRegistrationReviewProps = {
  className?: string;
  centerId?: string | number | null;
  token?: string;
  /** Optional mock dossier for local UI previews (skips network fetch). */
  previewDossier?: CenterRegistrationDossier | null;
};

function Fact({ label, value }: { label: string; value?: string | null }) {
  const text = String(value ?? "").trim();
  return (
    <div className={styles.fact}>
      <dt>{label}</dt>
      <dd>{text || "—"}</dd>
    </div>
  );
}

function DocCard({ label, url }: { label: string; url: string }) {
  const href = String(url || "").trim();
  if (!href) {
    return (
      <div className={styles.docCardEmpty}>
        <span>{label}</span>
        <em>بارگذاری نشده</em>
      </div>
    );
  }
  return (
    <a
      className={styles.docCard}
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      <img src={href} alt={label} />
      <span>{label}</span>
    </a>
  );
}

export default function CenterRegistrationReview({
  className,
  centerId,
  token,
  previewDossier
}: CenterRegistrationReviewProps) {
  const router = useRouter();
  const globalActions = useGlobalActions();
  const previewMode = previewDossier != null;
  const [dossier, setDossier] = React.useState<CenterRegistrationDossier | null>(
    previewDossier ?? null
  );
  const [loading, setLoading] = React.useState(!previewMode);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState<"approved" | "rejected" | null>(null);

  const toast = React.useCallback(
    (type: "success" | "error", message: string) => {
      globalActions?.["Fragment.showToast"]?.(type, message, "top-center");
    },
    [globalActions]
  );

  const load = React.useCallback(async () => {
    if (previewMode) {
      setDossier(previewDossier);
      setLoading(false);
      setError("");
      return;
    }
    if (!centerId) {
      setError("شناسه مرکز نامعتبر است.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const next = await fetchCenterRegistration(centerId, token);
      setDossier(next);
    } catch (err) {
      setDossier(null);
      setError(
        err instanceof Error ? err.message : "بارگذاری اطلاعات مرکز ناموفق بود."
      );
    } finally {
      setLoading(false);
    }
  }, [centerId, previewDossier, previewMode, token]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const applyStatus = React.useCallback(
    async (status: "approved" | "rejected") => {
      if (!centerId || busy || previewMode) return;
      setBusy(status);
      try {
        const next = await setCenterApprovalStatus(centerId, status, token);
        setDossier(next);
        toast(
          "success",
          status === "approved"
            ? "مرکز تأیید شد و حساب کاربری فعال گردید."
            : "درخواست ثبت‌نام مرکز رد شد."
        );
      } catch (err) {
        toast(
          "error",
          err instanceof Error
            ? err.message
            : "به‌روزرسانی وضعیت تأیید ناموفق بود."
        );
      } finally {
        setBusy(null);
      }
    },
    [busy, centerId, previewMode, toast, token]
  );

  return (
    <section
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-sayban-center-registration-review="true"
    >
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <button
            type="button"
            className={styles.backLink}
            onClick={() => {
              navigateToCentersList(router);
            }}
          >
            بازگشت به لیست مراکز
          </button>
          <h1 className={styles.title}>مشاهده اطلاعات مرکز</h1>
          <p className={styles.subtitle}>
            اطلاعات، تصاویر و مدارک ثبت‌نام را بررسی کنید و حساب را تأیید یا رد
            نمایید.
          </p>
        </div>
        {dossier ? (
          <span
            className={styles.badge}
            data-status={dossier.approval_status}
          >
            {APPROVAL_STATUS_LABELS[dossier.approval_status]}
          </span>
        ) : null}
      </header>

      <div className={styles.body}>
        <div className={styles.panel}>
          {loading ? (
            <div className={styles.stateBlock}>
              <p className={styles.muted}>در حال بارگذاری...</p>
            </div>
          ) : null}
          {error ? (
            <div className={styles.stateBlock}>
              <p className={styles.error}>{error}</p>
            </div>
          ) : null}

          {dossier ? (
            <>
              <div className={styles.scroll}>
                <div className={styles.grid}>
                  <section className={styles.card}>
                    <h2 className={styles.cardTitle}>اطلاعات مرکز</h2>
                    <dl className={styles.facts}>
                      <Fact label="نام مرکز" value={dossier.name} />
                      <Fact
                        label="نام ثبت‌شده در مدارک"
                        value={dossier.registered_center_name}
                      />
                      <Fact label="نوع مرکز" value={dossier.care_domain_fa} />
                      <Fact label="تلفن" value={dossier.phone} />
                      <Fact label="ایمیل حساب" value={dossier.account_email} />
                      <Fact label="شهر" value={dossier.city} />
                      <Fact label="استان" value={dossier.state} />
                      <Fact label="آدرس" value={dossier.address} />
                    </dl>
                  </section>

                  <section className={styles.card}>
                    <h2 className={styles.cardTitle}>مسئول مرکز و حساب</h2>
                    <dl className={styles.facts}>
                      <Fact
                        label="نام خانوادگی مسئول"
                        value={dossier.manager_last_name}
                      />
                      <Fact
                        label="وضعیت تأیید"
                        value={APPROVAL_STATUS_LABELS[dossier.approval_status]}
                      />
                      <Fact
                        label="وضعیت حساب"
                        value={
                          dossier.account_is_active == null
                            ? "حسابی ثبت نشده"
                            : dossier.account_is_active === 1
                              ? "فعال"
                              : "غیرفعال"
                        }
                      />
                      <Fact
                        label="فعال بودن مرکز"
                        value={dossier.is_active === 1 ? "فعال" : "غیرفعال"}
                      />
                    </dl>
                  </section>
                </div>

                <section className={styles.card}>
                  <h2 className={styles.cardTitle}>مدارک ثبت‌نام</h2>
                  <div className={styles.docs}>
                    <DocCard
                      label={OWNER_DOCS_LABELS.establishment_notice}
                      url={dossier.establishment_notice}
                    />
                    <DocCard
                      label={OWNER_DOCS_LABELS.license_number}
                      url={dossier.license_number}
                    />
                    <DocCard
                      label={OWNER_DOCS_LABELS.registration_docs}
                      url={dossier.registration_docs}
                    />
                  </div>
                </section>

                <section className={styles.card}>
                  <h2 className={styles.cardTitle}>تصاویر مرکز</h2>
                  {dossier.images.length ? (
                    <div className={styles.gallery}>
                      {dossier.images.map(src => (
                        <a
                          key={src}
                          href={src}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.galleryItem}
                        >
                          <img src={src} alt="" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.muted}>تصویری ثبت نشده است.</p>
                  )}
                </section>
              </div>

              <footer className={styles.actions}>
                <button
                  type="button"
                  className={styles.rejectBtn}
                  disabled={
                    busy != null || dossier.approval_status === "rejected"
                  }
                  aria-busy={busy === "rejected" || undefined}
                  onClick={() => {
                    void applyStatus("rejected");
                  }}
                >
                  {busy === "rejected" ? "در حال رد..." : "رد مرکز"}
                </button>
                <button
                  type="button"
                  className={styles.approveBtn}
                  disabled={
                    busy != null || dossier.approval_status === "approved"
                  }
                  aria-busy={busy === "approved" || undefined}
                  onClick={() => {
                    void applyStatus("approved");
                  }}
                >
                  {busy === "approved" ? "در حال تأیید..." : "تأیید مرکز"}
                </button>
              </footer>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
