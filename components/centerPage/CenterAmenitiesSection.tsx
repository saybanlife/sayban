import * as React from "react";
import styles from "./CenterPage.module.css";
import { isPureNursingCenter } from "./centerEnumLocales";
import { CenterResult, getAmenityItems } from "./centerHelpers";
import { getServiceIcon } from "./serviceIcons";

const DEFAULT_VISIBLE_COUNT = 8;

function AmenityIcon({
  name,
  slug,
  icon,
  index
}: {
  name?: string;
  slug?: string;
  icon?: string;
  index: number;
}) {
  const Icon = getServiceIcon({ name, description: slug }, index);
  if (icon && /^https?:\/\//i.test(icon)) {
    return (
      <img alt="" className={styles.profileCardIcon} src={icon} loading="lazy" />
    );
  }
  return <Icon className={styles.profileCardIcon} role="img" aria-hidden />;
}

export function CenterAmenitiesSection({ result }: { result?: CenterResult }) {
  if (isPureNursingCenter(result?.care_domain)) return null;
  const amenities = getAmenityItems(result);
  const [expanded, setExpanded] = React.useState(false);

  if (!amenities.length) return null;

  const hasMore = amenities.length > DEFAULT_VISIBLE_COUNT;
  const visibleItems = expanded
    ? amenities
    : amenities.slice(0, DEFAULT_VISIBLE_COUNT);

  return (
    <div id="center-amenities" className={`${styles.section} ${styles.iconsDuotone}`}>
      <div className={styles.sectionHeaderRow}>
        <div className={styles.sectionTitle}>امکانات مرکز</div>
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

      <div className={styles.profileCardGridServices}>
        {visibleItems.map((item, index) => (
          <div
            className={styles.profileCard}
            key={item.id ?? `${item.name}-${index}`}
          >
            <span className={styles.profileCardIconWrap}>
              <AmenityIcon
                name={item.name}
                slug={item.slug}
                icon={item.icon}
                index={index}
              />
            </span>
            <span className={styles.profileCardLabel}>
              {item.name || item.description || ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CenterAmenitiesSection;
