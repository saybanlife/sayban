import * as React from "react";
import styles from "./CenterPage.module.css";
import { CenterResult } from "./centerHelpers";
import {
  getDailyLifeItems,
  getFamilyVisitItems
} from "./centerProfileFields";
import { getDailyLifeIcon } from "./serviceIcons";

const DAILY_LIFE_VISIBLE_COUNT = 8;

export function CenterDailyLifeSection({ result }: { result?: CenterResult }) {
  const items = getDailyLifeItems(result);
  const [expanded, setExpanded] = React.useState(false);

  if (!items.length) return null;

  const hasMore = items.length > DAILY_LIFE_VISIBLE_COUNT;
  const visibleItems = expanded
    ? items
    : items.slice(0, DAILY_LIFE_VISIBLE_COUNT);

  return (
    <div id="center-daily-life" className={`${styles.section} ${styles.iconsDuotone}`}>
      <div className={styles.sectionHeaderRow}>
        <div className={styles.sectionTitle}>برنامه روزانه و فعالیت‌ها</div>
        {hasMore ? (
          <button
            type="button"
            className={styles.sectionAction}
            onClick={() => setExpanded(current => !current)}
          >
            {expanded ? "نمایش کمتر" : "مشاهده بیشتر"}
          </button>
        ) : null}
      </div>
      <div className={styles.profileCardGrid} role="list">
        {visibleItems.map((item, index) => {
          const Icon = getDailyLifeIcon(item.id, index);
          return (
            <div className={styles.profileCard} key={item.id} role="listitem">
              <span className={styles.profileCardIconWrap}>
                <Icon className={styles.profileCardIcon} role="img" aria-hidden />
              </span>
              <div className={styles.profileCardLabel}>{item.label}</div>
              {item.value ? (
                <div className={styles.profileCardValue}>{item.value}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CenterFamilyVisitSection({ result }: { result?: CenterResult }) {
  const items = getFamilyVisitItems(result);
  if (!items.length) return null;

  return (
    <div id="center-family" className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>ملاقات و ارتباط با خانواده</div>
      </div>
      <div className={styles.familyVisitGrid} role="list">
        {items.map(item => (
          <div className={styles.familyVisitRow} key={item.key} role="listitem">
            <div className={styles.familyVisitLabel}>{item.label}</div>
            {item.value ? (
              <div className={styles.familyVisitValue}>{item.value}</div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
