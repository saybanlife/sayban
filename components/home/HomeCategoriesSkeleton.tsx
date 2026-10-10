import * as React from "react";
import styles from "./HomeCategoriesSkeleton.module.css";

/** Matches PAGE_SIZE in HomeCategoriesPager, so the grid has the same columns. */
const CATEGORY_CARDS = 3;

/** Enough to fill a mobile viewport without implying an exact server count. */
const POPULAR_CARDS = 7;

export type HomeCategoriesSkeletonProps = {
  className?: string;
};

/**
 * Loading placeholder for the Home categories band: the 3-up category grid plus
 * the "most used services" strip below it. Sizes mirror the real components so
 * the layout does not jump when data arrives.
 */
export default function HomeCategoriesSkeleton({
  className
}: HomeCategoriesSkeletonProps) {
  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      aria-hidden="true"
    >
      <div className={styles.pager}>
        <div className={styles.track}>
          {Array.from({ length: CATEGORY_CARDS }, (_, index) => (
            <div className={styles.card} key={index}>
              <div className={`${styles.sk} ${styles.cardImage}`} />
              <div className={`${styles.sk} ${styles.cardTitle}`} />
              <div className={`${styles.sk} ${styles.cardSubtitle}`} />
            </div>
          ))}
        </div>
      </div>

      <div className={styles.sectionHeader}>
        <div className={`${styles.sk} ${styles.sectionIcon}`} />
        <div className={`${styles.sk} ${styles.sectionTitle}`} />
      </div>

      <div className={styles.popular}>
        <div className={styles.popularScroller}>
          {Array.from({ length: POPULAR_CARDS }, (_, index) => (
            <div className={styles.popularCard} key={index}>
              <div className={`${styles.sk} ${styles.popularIconBox}`} />
              <div className={`${styles.sk} ${styles.popularLabel}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
