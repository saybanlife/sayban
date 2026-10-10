import * as React from "react";
import styles from "./CenterPage.module.css";
import { CenterServiceItem } from "./centerHelpers";
import { getServiceIcon } from "./serviceIcons";

const DEFAULT_VISIBLE_COUNT = 8;

/**
 * TEMP: hide public Center "خدمات" section from UI only.
 * Keep component + data plumbing so it can be re-enabled later.
 */
export const CENTER_SERVICES_SECTION_VISIBLE = false;

export function CenterServicesSection({
  services = [],
  selectedServiceId,
  onServiceClick
}: {
  services?: CenterServiceItem[];
  selectedServiceId?: string | number;
  onServiceClick?: (service: CenterServiceItem) => void | Promise<void>;
}) {
  const [expanded, setExpanded] = React.useState(false);

  if (!CENTER_SERVICES_SECTION_VISIBLE) return null;
  if (!services.length) return null;

  const hasMore = services.length > DEFAULT_VISIBLE_COUNT;
  const visibleServices = expanded
    ? services
    : services.slice(0, DEFAULT_VISIBLE_COUNT);

  return (
    <div id="center-services" className={`${styles.section} ${styles.iconsDuotone}`}>
      <div className={styles.sectionHeaderRow}>
        <div className={styles.sectionTitleBlock}>
          <div className={styles.sectionTitle}>خدمات</div>
        </div>
        {hasMore ? (
          <button
            type="button"
            className={styles.sectionAction}
            onClick={() => setExpanded(current => !current)}
          >
            {expanded ? "نمایش کمتر" : "مشاهده همه"}
          </button>
        ) : null}
      </div>

      <div className={styles.profileCardGridServices}>
        {visibleServices.map((service, index) => {
          const Icon = getServiceIcon(service, index);
          const isSelected =
            selectedServiceId != null && service.id === selectedServiceId;
          const label = service.name || service.description || "";

          return (
            <button
              type="button"
              className={`${styles.profileCard} ${styles.profileCardButton} ${
                isSelected ? styles.profileCardSelected : ""
              }`}
              key={service.id ?? index}
              onClick={() => onServiceClick?.(service)}
            >
              <span className={styles.profileCardIconWrap}>
                <Icon className={styles.profileCardIcon} role="img" />
              </span>
              <span className={styles.profileCardLabel}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
