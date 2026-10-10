import * as React from "react";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import Dialog from "../Dialog";
import styles from "./CenterPage.module.css";
import { normalizePhone } from "./centerHelpers";
import { toPersianDigits } from "@/lib/datetime";
import PlasmicIcon__Phone from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Phone";
import PlasmicIcon__Calendar from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Calendar";
import PlasmicIcon__Copy from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Copy";
import { ensureVerifiedPublicAuth } from "@/lib/publicAuthGate";

const EMPTY_MESSAGE = "متأسفانه شماره تماسی برای این مرکز ثبت نشده است.";
const HAS_PHONE_HINT =
  "برای دریافت مشاوره و راهنمایی از مرکز، می‌توانید با شماره زیر تماس بگیرید.";

function displayPhone(phone: string) {
  return toPersianDigits(phone.trim());
}

async function copyText(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  // Fallback for older WebViews used by the mobile app shell.
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function CenterFixedFooter({
  phone,
  onBookVisit
}: {
  phone?: string;
  onBookVisit: () => void;
}) {
  const actions = useGlobalActions();
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const raw = String(phone || "").trim();
  const tel = normalizePhone(raw);
  const hasPhone = Boolean(tel);
  const shown = hasPhone ? displayPhone(raw) : "";

  React.useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const toast = (type: "success" | "error", message: string) => {
    actions?.["Fragment.showToast"]?.(type, message, "top-center");
  };

  const onCopy = async () => {
    if (!hasPhone) return;
    const ok = await copyText(raw);
    if (ok) {
      setCopied(true);
      toast("success", "شماره کپی شد.");
      window.setTimeout(() => setCopied(false), 1800);
    } else {
      toast("error", "کپی شماره ممکن نشد.");
    }
  };

  const onCall = () => {
    if (!hasPhone || typeof window === "undefined") return;
    window.location.href = `tel:${tel}`;
  };

  return (
    <>
      <div className={`${styles.fixedFooter} page`}>
        <button
          type="button"
          className={`${styles.fixedFooterBtn} ${styles.fixedFooterBtnPhone}`}
          onClick={() => {
            ensureVerifiedPublicAuth({
              message:
                "برای دریافت مشاوره تلفنی باید شماره موبایل خود را تأیید کنید.",
              onVerified: () => setOpen(true)
            });
          }}
        >
          <PlasmicIcon__Phone
            className={`${styles.fixedFooterBtnIcon} ${styles.iconDuotone}`}
            role="img"
          />
          مشاوره تلفنی
        </button>
        <button
          type="button"
          className={`${styles.fixedFooterBtn} ${styles.fixedFooterBtnVisit}`}
          onClick={() => {
            ensureVerifiedPublicAuth({
              message:
                "برای رزرو وقت بازدید باید شماره موبایل خود را تأیید کنید.",
              onVerified: () => onBookVisit()
            });
          }}
        >
          <PlasmicIcon__Calendar
            className={`${styles.fixedFooterBtnIcon} ${styles.iconDuotone}`}
            role="img"
          />
          رزرو وقت بازدید
        </button>
      </div>

      <Dialog
        className={styles.phoneConsultDialog}
        modalHashId="phone-consult"
        nopadding={true}
        opendialog={open}
        onOpendialogChange={(val: unknown) => {
          setOpen(Boolean(val));
          if (!val) setCopied(false);
        }}
      >
        <div className={styles.phoneConsultBody} dir="rtl">
          <div className={styles.phoneConsultHero} aria-hidden>
            <span className={styles.phoneConsultHeroIcon}>
              <PlasmicIcon__Phone
                className={styles.phoneConsultHeroPhone}
                role="img"
              />
            </span>
          </div>
          <h2 className={styles.phoneConsultTitle}>مشاوره تلفنی</h2>

          {hasPhone ? (
            <>
              <p className={styles.phoneConsultHint}>{HAS_PHONE_HINT}</p>
              <div className={styles.phoneConsultNumberBox}>
                <PlasmicIcon__Phone
                  className={styles.phoneConsultNumberIcon}
                  role="img"
                  aria-hidden
                />
                <span className={styles.phoneConsultNumber} dir="ltr">
                  {shown}
                </span>
              </div>
            </>
          ) : (
            <>
              <p className={styles.phoneConsultEmpty}>{EMPTY_MESSAGE}</p>
              <div className={styles.phoneConsultDivider} aria-hidden />
            </>
          )}

          <div className={styles.phoneConsultActions}>
            <button
              type="button"
              className={styles.phoneConsultCallBtn}
              onClick={onCall}
              disabled={!hasPhone}
            >
              <PlasmicIcon__Phone
                className={styles.phoneConsultActionIcon}
                role="img"
                aria-hidden
              />
              تماس مستقیم
            </button>
            <button
              type="button"
              className={styles.phoneConsultCopyBtn}
              onClick={() => void onCopy()}
              disabled={!hasPhone}
            >
              <PlasmicIcon__Copy
                className={styles.phoneConsultActionIcon}
                role="img"
                aria-hidden
              />
              {copied ? "کپی شد" : "کپی شماره"}
            </button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
