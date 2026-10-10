import * as React from "react";
import Dialog from "../Dialog";
import styles from "./CenterPage.module.css";
import { CenterReviewsSection } from "./CenterReviewsSection";
import { canSubmitCenterReview } from "./centerReviewApi";
import type { CenterReviewItem } from "./centerHelpers";
import { buildModalHash } from "@/lib/modalHash";
import Button from "../Button";

type CenterReviewsLauncherProps = {
  ratingAvg?: number | string;
  totalCount?: number;
  percentages?: Record<string | number, number>;
  reviews?: CenterReviewItem[];
  /** Enables the submit call to action; omit to render the dialog read-only. */
  centerId?: number | string;
  /**
   * Opens the page's own rating dialog — the same one the hero heart icon
   * opens — so submitting a review looks and behaves identically from both
   * entry points.
   */
  onOpenReviewForm?: () => void;
};

/**
 * Hero rating row + “مشاهده نظرات”.
 * Opens a Dialog synced to `#modal-comment`.
 */
export function CenterReviewsLauncher({
  ratingAvg,
  totalCount = 0,
  percentages,
  reviews = [],
  centerId,
  onOpenReviewForm
}: CenterReviewsLauncherProps) {
  const [open, setOpen] = React.useState(false);
  const average = Number(ratingAvg);
  const canSubmit = canSubmitCenterReview();

  // Only adopt a deep link on mount. Staying subscribed to popstate/hashchange
  // fought the Dialog's own useModalHash for this hash: it re-derived `open`
  // from a hash the Dialog was in the middle of clearing, so Back reopened the
  // dialog instead of closing it.
  React.useEffect(() => {
    if (window.location.hash === buildModalHash("comment")) {
      setOpen(true);
    }
  }, []);

  const openReviews = React.useCallback(() => {
    setOpen(true);
  }, []);

  // Hand off to the rating dialog. Closing this one first keeps a single modal
  // on screen; stacking two Dialogs is what made the old inline form
  // unreachable.
  const startReview = React.useCallback(() => {
    setOpen(false);
    window.setTimeout(() => onOpenReviewForm?.(), 0);
  }, [onOpenReviewForm]);

  if (!average && !totalCount && !reviews.length && !centerId) {
    return null;
  }

  return (
    <>
      <div className={styles.ratingRow}>
        {average ? (
          <>
            <span className={styles.ratingValue}>{ratingAvg}</span>
            <span className={styles.ratingStars} aria-hidden="true">
              {"★★★★★"}
            </span>
          </>
        ) : null}
        <span className={styles.ratingCount}>{`(${totalCount || 0})نفر `}</span>
        <button
          type="button"
          className={styles.reviewsViewBtn}
          onClick={openReviews}
        >
          مشاهده نظرات
        </button>
      </div>

      <Dialog
        className={styles.reviewsDialog}
        modalHashId="comment"
        nopadding={true}
        opendialog={open}
        onOpendialogChange={(val: unknown) => {
          setOpen(Boolean(val));
        }}
      >
        <div className={styles.reviewsDialogBody} dir="rtl">
          {/* Pinned above the scrolling list; at the bottom it sat below the
              fold of a long list and read as missing. */}
          <div className={styles.reviewsDialogHead}>
            <div className={styles.reviewsDialogTitle}>نظرات کاربران</div>
          </div>

          <div className={styles.reviewsDialogScroll}>
            <CenterReviewsSection
              percentages={percentages}
              ratingAvg={ratingAvg}
              reviews={reviews}
              showHeader={false}
              totalCount={totalCount || 0}
            />
          </div>
          {centerId && onOpenReviewForm ? (
            canSubmit ? (
              <Button
                color="second"
                size="extraLarge"
                label="ثبت نظر"
                onClick={startReview}
              />
            ) : (
              <span className={styles.reviewsSubmitNotice}>
                برای ثبت نظر ابتدا وارد حساب خود شوید.
              </span>
            )
          ) : null}
        </div>
      </Dialog>
    </>
  );
}

export default CenterReviewsLauncher;
