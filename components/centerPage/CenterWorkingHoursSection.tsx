import * as React from "react";
import styles from "./CenterPage.module.css";
import { isPureNursingCenter } from "./centerEnumLocales";
import { CenterResult, getWorkingHoursRows } from "./centerHelpers";
import CalendarTimeIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__CalendarTime";

export function CenterWorkingHoursSection({ result }: { result?: CenterResult }) {
  if (isPureNursingCenter(result?.care_domain)) return null;
  const rows = getWorkingHoursRows(result);

  if (!rows.length) return null;

  return (
    <div id="center-care" className={`${styles.section} ${styles.iconsDuotone}`}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>ساعات کاری</div>
      </div>

      <div className={styles.profileListVertical} role="list">
        {rows.map((row, index) => (
          <div
            className={styles.profileRowCard}
            key={`${row.label}-${index}`}
            role="listitem"
          >
            <div className={styles.rowIconCol}>
              <span className={styles.careRowIconWrap}>
                <CalendarTimeIcon className={styles.careRowIcon} role="img" aria-hidden />
              </span>
            </div>

            <div className={styles.rowContentCol}>
              <div className={styles.careRowLabel}>{row.label}</div>
            </div>

            {row.value ? (
              <div className={styles.rowTimeCol}>
                <span className={styles.workingHoursTime}>{row.value}</span>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CenterWorkingHoursSection;
