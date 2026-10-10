import * as React from "react";
import { classNames, hasVariant } from "@plasmicapp/react-web";
import { Dialog, DialogContent, DialogTitle } from "@plasmicpkgs/radix-ui";
import { _useGlobalVariants } from "../plasmic/sayban/plasmic";
import { _useStyleTokens } from "../plasmic/sayban/PlasmicStyleTokensProvider";
import filterStyles from "../plasmic/sayban/PlasmicFilter.module.css";
import { createSupportCallbackRequest } from "./supportApi";
import {
  formatPhoneDisplay,
  isValidMobilePhone,
  normalizePreferredTime,
  profileMobile,
  supportOffHoursNotice,
  toEnglishDigits,
  type SupportCallbackTimePreference
} from "./supportCallbackModel";
import styles from "./SupportCallbackDialog.module.css";

export type SupportCallbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: unknown;
  token?: string;
  source?: string;
  onSuccess?: () => void;
  onError?: (message: string) => void;
};

export default function SupportCallbackDialog({
  open,
  onOpenChange,
  profile,
  token,
  source = "nurse_request",
  onSuccess,
  onError
}: SupportCallbackDialogProps) {
  const globalVariants = _useGlobalVariants();
  const styleTokensClassNames = _useStyleTokens();
  const isMobile = hasVariant(globalVariants, "screen", "mobileOnly");

  const [phone, setPhone] = React.useState("");
  const [timePreference, setTimePreference] =
    React.useState<SupportCallbackTimePreference>("anytime");
  const [preferredTime, setPreferredTime] = React.useState("10:00");
  const [submitting, setSubmitting] = React.useState(false);

  const offHours = React.useMemo(() => supportOffHoursNotice(), [open]);

  React.useEffect(() => {
    if (!open) return;
    setPhone(formatPhoneDisplay(profileMobile(profile)));
    setTimePreference("anytime");
    setPreferredTime("10:00");
  }, [open, profile]);

  const submit = async () => {
    if (!isValidMobilePhone(phone)) {
      onError?.("شماره تماس معتبر نیست.");
      return;
    }
    if (timePreference === "specific" && !normalizePreferredTime(preferredTime)) {
      onError?.("ساعت تماس را مشخص کنید.");
      return;
    }
    setSubmitting(true);
    try {
      const { ok, data } = await createSupportCallbackRequest(
        {
          phone: toEnglishDigits(phone).replace(/\D/g, ""),
          time_preference: timePreference,
          preferred_time:
            timePreference === "specific"
              ? normalizePreferredTime(preferredTime)
              : null,
          source
        },
        token
      );
      if (!ok || data?.success === false) {
        throw new Error(data?.message || "ثبت درخواست تماس ناموفق بود.");
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : "ثبت درخواست تماس ناموفق بود."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      className={classNames(
        "__wab_instance",
        "root_reset_qARqpE4p5tZmJuNxFbTaPz",
        "plasmic_default_styles",
        "plasmic_mixins",
        styleTokensClassNames,
        filterStyles.dialog3
      )}
      open={open}
      onOpenChange={onOpenChange}
      overlayClassName={classNames(
        filterStyles["pcls_q2T0XKdiWi8t"],
        isMobile ? filterStyles["pcls_vBH8saG-EOIi"] : "",
        styles.overlay
      )}
      themeResetClass={classNames(
        "root_reset_qARqpE4p5tZmJuNxFbTaPz",
        "plasmic_default_styles",
        "plasmic_mixins",
        styleTokensClassNames
      )}
      triggerSlot={<span className={styles.hiddenTrigger} aria-hidden />}
    >
      <DialogContent
        className={classNames(
          "__wab_instance",
          filterStyles.dialogContent,
          styles.content
        )}
        enterAnimations={["slide-in-from-bottom", "fade-in"]}
        enterDuration={0.22}
        exitAnimations={["slide-out-to-bottom", "fade-out"]}
        exitDuration={0.18}
        themeResetClass={classNames(
          "root_reset_qARqpE4p5tZmJuNxFbTaPz",
          "plasmic_default_styles",
          "plasmic_mixins",
          styleTokensClassNames
        )}
      >
        <div className={styles.handle} aria-hidden />
        <DialogTitle className={classNames("__wab_instance", filterStyles.dialogTitle)}>
          <h2 className={styles.title}>پشتیبان با شما تماس می‌گیرد</h2>
        </DialogTitle>
        <p className={styles.subtitle}>
          سؤال‌ها را تلفنی می‌پرسد و درخواست را به‌جای شما ثبت می‌کند.
        </p>

        <label className={styles.field}>
          <span className={styles.label}>شماره تماس</span>
          <input
            className={styles.input}
            dir="ltr"
            inputMode="tel"
            value={phone}
            onChange={event => setPhone(event.target.value)}
            placeholder="۰۹۱۲۳۴۵۶۷۸۹"
          />
        </label>

        <div className={styles.timeToggle} role="group" aria-label="زمان تماس">
          <button
            type="button"
            className={
              timePreference === "anytime" ? styles.timeOn : styles.timeOff
            }
            onClick={() => setTimePreference("anytime")}
          >
            هر وقت
          </button>
          <button
            type="button"
            className={
              timePreference === "specific" ? styles.timeOn : styles.timeOff
            }
            onClick={() => setTimePreference("specific")}
          >
            ساعت مشخص
          </button>
        </div>

        {timePreference === "specific" ? (
          <label className={styles.field}>
            <span className={styles.label}>ساعت تماس</span>
            <input
              className={styles.input}
              type="time"
              value={preferredTime}
              onChange={event => setPreferredTime(event.target.value)}
            />
          </label>
        ) : null}

        {offHours.outside ? (
          <div className={styles.notice}>
            {offHours.lines.map(line => (
              <div key={line}>{line}</div>
            ))}
          </div>
        ) : null}

        <button
          type="button"
          className={styles.submit}
          disabled={submitting}
          onClick={() => void submit()}
        >
          <span className={styles.phoneIcon} aria-hidden>
            ☎
          </span>
          {submitting ? "در حال ثبت…" : "درخواست تماس"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
