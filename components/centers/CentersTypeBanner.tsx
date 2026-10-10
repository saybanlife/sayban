import * as React from "react";
import { CENTERS_LIST_INFO } from "./centersListInfoContent";
import styles from "./CentersTypeBanner.module.css";

type CentersTypeBannerProps = {
  className?: string;
};

/**
 * Explains روزانه vs شبانه‌روزی inline above the centers list.
 *
 * Replaces the header info button: the copy is reference material, so it reads
 * as a quiet banner rather than competing with the list for attention.
 */
export default function CentersTypeBanner({
  className
}: CentersTypeBannerProps) {
  return (
    <aside
      className={[styles.banner, className].filter(Boolean).join(" ")}
      aria-label={CENTERS_LIST_INFO.title}
    >
      <div className={styles.title}>{CENTERS_LIST_INFO.title}</div>
      <div className={styles.items}>
        {CENTERS_LIST_INFO.items.map(item => (
          <p key={item.term} className={styles.item}>
            <span className={styles.term}>{item.term}</span>
            <span className={styles.definition}>{item.definition}</span>
          </p>
        ))}
      </div>
    </aside>
  );
}
