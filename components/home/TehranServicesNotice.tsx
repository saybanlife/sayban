import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@plasmicpkgs/radix-ui";
import { classNames, hasVariant } from "@plasmicapp/react-web";
import { _useGlobalVariants } from "../plasmic/sayban/plasmic";
import { _useStyleTokens } from "../plasmic/sayban/PlasmicStyleTokensProvider";
import filterSty from "../plasmic/sayban/PlasmicFilter.module.css";
import { readCookie } from "../support/supportTypes";
import styles from "./TehranServicesNotice.module.css";

const STORAGE_PREFIX = "sayban.tehranServicesNoticeSeen";

function decodeUserIdFromToken(token: string): string | null {
  try {
    const raw = token.split(".")[1];
    if (!raw) return null;
    const padded = raw.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
    const payload = JSON.parse(json) as Record<string, unknown>;
    const id = payload.id ?? payload.userId ?? payload.sub;
    if (id == null || String(id).trim() === "") return null;
    return String(id);
  } catch {
    return null;
  }
}

function storageKeyForUser(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function hasSeenTehranServicesNotice(userId: string) {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(storageKeyForUser(userId)) === "1";
  } catch {
    return false;
  }
}

export function markTehranServicesNoticeSeen(userId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKeyForUser(userId), "1");
  } catch {
    /* ignore quota */
  }
}

export type TehranServicesNoticeProps = {
  /** When false, never show (e.g. support embed active). */
  enabled?: boolean;
};

/**
 * First Home visit after login: Tehran availability notice.
 * Persists per user id from auth cookie token.
 */
export default function TehranServicesNotice({
  enabled = true
}: TehranServicesNoticeProps) {
  const globalVariants = _useGlobalVariants();
  const styleTokensClassNames = _useStyleTokens();
  const isMobile = hasVariant(globalVariants, "screen", "mobileOnly");
  const [open, setOpen] = React.useState(false);
  const [userId, setUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled) return;
    const token = readCookie("token");
    if (!token) return;
    const id = decodeUserIdFromToken(token);
    if (!id) return;
    setUserId(id);
    if (hasSeenTehranServicesNotice(id)) return;
    const timer = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  const acknowledge = React.useCallback(() => {
    if (userId) markTehranServicesNoticeSeen(userId);
    setOpen(false);
  }, [userId]);

  if (!enabled || !userId) return null;

  return (
    <Dialog
      className={classNames(
        "__wab_instance",
        "root_reset_qARqpE4p5tZmJuNxFbTaPz",
        "plasmic_default_styles",
        "plasmic_mixins",
        styleTokensClassNames,
        filterSty.dialog3
      )}
      open={open}
      onOpenChange={next => {
        if (!next) acknowledge();
        else setOpen(true);
      }}
      overlayClassName={classNames({
        [filterSty["pcls_q2T0XKdiWi8t"]]: true,
        [filterSty["pcls_vBH8saG-EOIi"]]: isMobile
      })}
      themeResetClass={classNames(
        "root_reset_qARqpE4p5tZmJuNxFbTaPz",
        "plasmic_default_styles",
        "plasmic_mixins",
        styleTokensClassNames
      )}
      triggerSlot={<span className={styles.hiddenTrigger} aria-hidden />}
    >
      <DialogContent
        className={classNames("__wab_instance", filterSty.dialogContent, styles.content)}
        enterAnimations={
          isMobile ? ["slide-in-from-bottom"] : ["zoom-enter", "fade-in"]
        }
        enterDuration={0.4}
        exitAnimations={
          isMobile ? ["slide-out-to-bottom"] : ["zoom-exit", "fade-out"]
        }
        exitDuration={0.35}
        themeResetClass={classNames(
          "root_reset_qARqpE4p5tZmJuNxFbTaPz",
          "plasmic_default_styles",
          "plasmic_mixins",
          styleTokensClassNames
        )}
      >
        <DialogTitle className={classNames("__wab_instance", filterSty.dialogTitle)}>
          <span className={styles.title}>محدوده ارائه خدمات</span>
        </DialogTitle>
        <div className={styles.body}>
          <p className={styles.lead}>
            در حال حاضر خدمات سایبان در شهر تهران ارائه می‌شود.
          </p>
          <p className={styles.hint}>
            به‌زودی شهرهای دیگر هم اضافه می‌شوند. از همراهی شما سپاسگزاریم.
          </p>
          <button type="button" className={styles.cta} onClick={acknowledge}>
            متوجه شدم
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
