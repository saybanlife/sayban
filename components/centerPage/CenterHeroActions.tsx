import * as React from "react";
import { useRouter } from "next/router";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import ShareIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Share";
import HeartIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Heart";
import HeartFilledIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__HeartFilled";
import styles from "./CenterPage.module.css";
import {
  fetchFavoriteStatus,
  notifyFavoritesChanged,
  toggleFavorite
} from "../favorites/favoritesApi";
import {
  parseNumericCenterId,
  useCenterFavoriteContext
} from "../favorites/CenterFavoriteContext";
import { rememberAuthReturn } from "@/lib/guestSession";
import { ensureVerifiedPublicAuth } from "@/lib/publicAuthGate";

async function shareCurrentPage() {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const title =
    typeof document !== "undefined" ? document.title || "سایبان" : "سایبان";

  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      await navigator.share({ title, url });
      return;
    }
  } catch {
    // fall through to clipboard
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    }
  } catch {
    // ignore
  }
}

function readCenterIdFromLocation() {
  if (typeof window === "undefined") return null;
  const parts = window.location.pathname.split("/").filter(Boolean);
  const idx = parts.lastIndexOf("center");
  if (idx >= 0 && parts[idx + 1]) {
    const fromPath = parseNumericCenterId(parts[idx + 1]);
    if (fromPath) return fromPath;
  }
  try {
    return parseNumericCenterId(window.sessionStorage.getItem("id"));
  } catch {
    return null;
  }
}

export default function CenterHeroActions({
  onLikeClick: _unusedReview
}: {
  /** Kept for generated PlasmicCenter; favorites must not open the review dialog. */
  onLikeClick?: () => void;
}) {
  void _unusedReview;
  const router = useRouter();
  const actions = useGlobalActions();
  const favoriteCtx = useCenterFavoriteContext();
  const [centerId, setCenterId] = React.useState<number | null>(null);
  const [favorited, setFavorited] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const fromCtx = parseNumericCenterId(favoriteCtx.centerId);
    const next = fromCtx || readCenterIdFromLocation();
    setCenterId(next);
    if (!next) {
      setFavorited(false);
      return;
    }
    let alive = true;
    fetchFavoriteStatus(next, favoriteCtx.token)
      .then(status => {
        if (alive) setFavorited(status.favorited);
      })
      .catch(() => {
        if (alive) setFavorited(false);
      });
    return () => {
      alive = false;
    };
  }, [favoriteCtx.centerId, favoriteCtx.token, router.asPath]);

  const onFavorite = async () => {
    const id =
      parseNumericCenterId(favoriteCtx.centerId) ||
      centerId ||
      readCenterIdFromLocation();
    if (!id || busy) {
      if (!id) {
        actions?.["Fragment.showToast"]?.(
          "error",
          "شناسه مرکز هنوز آماده نیست. کمی بعد دوباره تلاش کنید.",
          "top-center"
        );
      }
      return;
    }
    setBusy(true);
    const previous = favorited;
    // Optimistic UI so the heart flips immediately.
    setFavorited(!previous);
    try {
      const result = await toggleFavorite(id, favoriteCtx.token);
      if (!result.loggedIn) {
        setFavorited(previous);
        actions?.["Fragment.showToast"]?.(
          "error",
          "برای ذخیره علاقه‌مندی وارد حساب کاربری شوید.",
          "top-center"
        );
        rememberAuthReturn(router.asPath);
        ensureVerifiedPublicAuth({
          message: "برای ذخیره علاقه‌مندی باید شماره موبایل خود را تأیید کنید.",
          onVerified: () => {
            // Prefer cookie written by OTP; context token may still be the guest JWT.
            void toggleFavorite(id, null).then(result => {
              if (!result.loggedIn) return;
              setFavorited(result.favorited);
              notifyFavoritesChanged(id, result.favorited);
              actions?.["Fragment.showToast"]?.(
                "success",
                result.favorited
                  ? "به علاقه‌مندی‌ها اضافه شد."
                  : "از علاقه‌مندی‌ها حذف شد.",
                "top-center"
              );
            });
          }
        });
        return;
      }
      setFavorited(result.favorited);
      notifyFavoritesChanged(id, result.favorited);
      actions?.["Fragment.showToast"]?.(
        "success",
        result.favorited
          ? "به علاقه‌مندی‌ها اضافه شد."
          : "از علاقه‌مندی‌ها حذف شد.",
        "top-center"
      );
    } catch (error) {
      setFavorited(previous);
      actions?.["Fragment.showToast"]?.(
        "error",
        error instanceof Error ? error.message : "ذخیره علاقه‌مندی ناموفق بود.",
        "top-center"
      );
    } finally {
      setBusy(false);
    }
  };

  const Heart = favorited ? HeartFilledIcon : HeartIcon;

  return (
    <div className={styles.heroFloatingActions}>
      <button
        type="button"
        className={styles.heroFloatingBtn}
        aria-label="اشتراک‌گذاری"
        onClick={() => {
          void shareCurrentPage();
        }}
      >
        <ShareIcon
          className={`${styles.heroFloatingBtnIcon} ${styles.iconDuotone}`}
          role="img"
        />
      </button>
      <button
        type="button"
        className={`${styles.heroFloatingBtn} ${
          favorited ? styles.heroFavoriteOn : ""
        }`}
        aria-label={
          favorited ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"
        }
        aria-pressed={favorited}
        aria-busy={busy || undefined}
        disabled={busy}
        onClick={event => {
          event.preventDefault();
          event.stopPropagation();
          void onFavorite();
        }}
      >
        <Heart
          className={`${styles.heroFloatingBtnIcon}${
            favorited ? "" : ` ${styles.iconDuotone}`
          }`}
          role="img"
        />
      </button>
    </div>
  );
}
