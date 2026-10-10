import * as React from "react";
import styles from "./CenterPage.module.css";
import { CenterResult } from "./centerHelpers";
import {
  getCareTreatmentGroups,
  type CareTreatmentItem
} from "./centerProfileFields";
import { getCareTreatmentIcon } from "./serviceIcons";
import PlasmicIcon__Check from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Check";

const DEFAULT_VISIBLE_COUNT = 8;

function CareRow({ item, index }: { item: CareTreatmentItem; index: number }) {
  const Icon = getCareTreatmentIcon(item, index);
  return (
    <div className={styles.profileRowCard} role="listitem">
      <div className={styles.rowIconCol}>
        <span className={styles.profileCardIconWrap}>
          <Icon className={styles.profileCardIcon} role="img" aria-hidden />
        </span>
      </div>

      <div className={styles.rowContentCol}>
        <div className={styles.careRowLabel}>{item.label}</div>
        {item.detail ? (
          <div className={styles.careRowDetail}>{item.detail}</div>
        ) : null}
      </div>

      <div className={styles.rowCheckCol}>
        <span className={styles.careRowCheck} aria-label="موجود">
          <PlasmicIcon__Check
            className={styles.careRowCheckIcon}
            role="img"
            aria-hidden
          />
        </span>
      </div>
    </div>
  );
}

function CareGroup({
  title,
  items,
  startIndex
}: {
  title: string;
  items: CareTreatmentItem[];
  startIndex: number;
}) {
  if (!items.length) return null;
  return (
    <div className={styles.careGroup}>
      <div className={styles.careGroupTitle}>{title}</div>
      <div className={styles.profileListVertical} role="list">
        {items.map((item, index) => (
          <CareRow key={item.id} item={item} index={startIndex + index} />
        ))}
      </div>
    </div>
  );
}

export function CenterCareSection({ result }: { result?: CenterResult }) {
  const { facilities, services, doctor } = getCareTreatmentGroups(result);
  const [expanded, setExpanded] = React.useState(false);

  const total = facilities.length + services.length + (doctor ? 1 : 0);
  if (!total) return null;

  // Collapsing trims the selectable services first — the facilities and the
  // doctor block are the headline information and always stay visible.
  const hasMore = total > DEFAULT_VISIBLE_COUNT;
  const serviceBudget = Math.max(
    0,
    DEFAULT_VISIBLE_COUNT - facilities.length - (doctor ? 1 : 0)
  );
  const visibleServices =
    expanded || !hasMore ? services : services.slice(0, serviceBudget);

  return (
    <div
      id="center-care-treatment"
      className={`${styles.section} ${styles.iconsDuotone}`}
    >
      <div className={styles.sectionHeaderRow}>
        <div className={styles.sectionTitle}>مراقبت و درمان</div>
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

      <CareGroup title="مراقبت و پشتیبانی" items={facilities} startIndex={0} />
      <CareGroup
        title="خدمات تخصصی"
        items={visibleServices}
        startIndex={facilities.length}
      />
      <CareGroup
        title="ویزیت پزشک"
        items={doctor ? [doctor] : []}
        startIndex={facilities.length + visibleServices.length}
      />
    </div>
  );
}

export default CenterCareSection;
