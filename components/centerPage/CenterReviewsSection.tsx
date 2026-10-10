import * as React from "react";
import { AntdProgress } from "@plasmicpkgs/antd5/skinny/registerProgress";
import Comment from "../Comment";
import Icon43Icon from "../plasmic/sayban/icons/PlasmicIcon__Icon43";
import PlasmicIcon__StarFilled from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__StarFilled";
import styles from "./CenterPage.module.css";
import {
  CenterReviewItem,
  buildStarBreakdown
} from "./centerHelpers";

function RatingStarsRow({ rating }: { rating: number }) {
  return (
    <div className={styles.reviewsOverallStars}>
      {[1, 2, 3, 4, 5].map(star => (
        <PlasmicIcon__StarFilled
          className={`${styles.reviewsOverallStar} ${
            star <= Math.round(rating) ? styles.reviewsOverallStarFilled : ""
          }`}
          key={star}
          role="img"
        />
      ))}
    </div>
  );
}

export function CenterReviewsSection({
  ratingAvg,
  totalCount,
  percentages,
  reviews = [],
  showHeader = true
}: {
  ratingAvg?: number | string;
  totalCount?: number;
  percentages?: Record<string | number, number>;
  reviews?: CenterReviewItem[];
  /** When false, title is provided by the parent dialog. */
  showHeader?: boolean;
}) {
  const filteredReviews = reviews.filter(
    review => review.comment != null && review.comment !== ""
  );
  const hasReviews = filteredReviews.length > 0;
  const breakdown = buildStarBreakdown(percentages, totalCount || 0);
  const average = Number(ratingAvg) || 0;

  return (
    <div className={`${styles.reviewsSection} ${styles.iconsDuotone}`} dir="rtl">
      {showHeader ? (
        <div className={styles.sectionHeaderRow}>
          <div className={styles.sectionTitle}>نظرات کاربران</div>
        </div>
      ) : null}

      {!hasReviews ? (
        <div className={styles.reviewsEmpty}>
          <Icon43Icon className={styles.reviewsEmptyIcon} role="img" />
          <div className={styles.reviewsEmptyText}>
            نظری برای نمایش وجود ندارد.
          </div>
        </div>
      ) : (
        <>
          {totalCount ? (
            <div className={styles.reviewsSummary}>
              <div className={styles.reviewsOverall}>
                <div className={styles.reviewsOverallScoreRow}>
                  <div className={styles.reviewsOverallScore}>
                    {average || "—"}
                  </div>
                  <div className={styles.reviewsOverallOfFive}> از ۵</div>
                </div>
                <RatingStarsRow rating={average} />
                <div className={styles.reviewsOverallCount}>
                  {`${totalCount} نفر `}
                </div>
              </div>

              <div className={styles.reviewsBreakdown}>
                {breakdown.map(item => (
                  <div className={styles.reviewsBreakdownRow} key={item.star}>
                    <div className={styles.reviewsBreakdownStarWrap}>
                      <span className={styles.reviewsBreakdownStar}>
                        {item.star}
                      </span>
                    </div>
                    <AntdProgress
                      className={styles.reviewsBreakdownProgress}
                      gradient={[]}
                      percent={item.percent}
                      showInfo={true}
                      strokeColor={true ? "#FDE047" : undefined}
                      strokeWidth={5}
                      trailColor={true ? "#FFFFFF40" : undefined}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className={styles.reviewsList}>
            {filteredReviews.map((review, index) => (
              <Comment
                className={styles.reviewsComment}
                key={review.id ?? index}
                user={review}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
