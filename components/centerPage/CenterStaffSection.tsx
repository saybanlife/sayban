import * as React from "react";
import { useRouter } from "next/router";
import { isNursingGlanceProfile } from "./centerEnumLocales";
import type { CenterResult } from "./centerHelpers";
import {
  formatStaffExperience,
  formatStaffRating,
  normalizeCenterStaff,
  staffTypeLabel
} from "./centerStaffModel";
import {
  buildCenterStaffListRoute,
  buildStaffRoute
} from "../centerNavigation";
import StarFilledIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__StarFilled";
import NurseIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Nurse";
import ChevronLeftIcon from "../plasmic/sayban/icons/PlasmicIcon__ChevronLeft";
import styles from "./CenterStaffSection.module.css";

type CenterStaffSectionProps = {
  result?: CenterResult;
  /** Public center id from the route (numeric or MD5). */
  centerRouteId?: string | number;
  /** When true, center payload is still loading. */
  loading?: boolean;
  className?: string;
};

export function CenterStaffSection({
  result,
  centerRouteId,
  loading = false,
  className
}: CenterStaffSectionProps) {
  const router = useRouter();
  const nursing = isNursingGlanceProfile(result?.care_domain);
  const staff = React.useMemo(
    () => normalizeCenterStaff(result?.staff ?? result?.staffs),
    [result?.staff, result?.staffs]
  );

  const pageBase =
    typeof router.query.page === "string" && router.query.page
      ? router.query.page
      : "home";

  const listCenterId = centerRouteId ?? result?.id ?? null;

  const goToStaff = React.useCallback(
    async (staffId: number) => {
      const route = buildStaffRoute(pageBase, staffId);
      if (route) await router.push(route);
    },
    [pageBase, router]
  );

  const goViewMore = React.useCallback(async () => {
    const route = buildCenterStaffListRoute(pageBase, listCenterId);
    if (route) await router.push(route);
  }, [listCenterId, pageBase, router]);

  // While loading we may not know care_domain yet — keep the strip mounted so
  // nursing centers do not flash empty. Hide only after we know it is not nursing.
  const showLoading = Boolean(loading) && !result;
  if (!showLoading && !nursing) return null;

  const empty = !showLoading && nursing && staff.length === 0;

  return (
    <section
      id="center-staff"
      className={[styles.root, className].filter(Boolean).join(" ")}
      aria-label="پرستاران مرکز"
    >
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <span className={styles.badge} aria-hidden>
            <NurseIcon />
          </span>
          <h2 className={styles.title}>پرستاران مرکز</h2>
        </div>
        {!empty ? (
          <button
            type="button"
            className={styles.viewAll}
            onClick={() => void goViewMore()}
            disabled={showLoading}
          >
            مشاهده بیشتر
            <ChevronLeftIcon className={styles.viewAllChevron} role="img" />
          </button>
        ) : null}
      </div>

      {showLoading ? (
        <div className={styles.scroller} aria-busy="true" aria-live="polite">
          {[0, 1, 2].map(key => (
            <div key={key} className={`${styles.card} ${styles.cardSkeleton}`} />
          ))}
        </div>
      ) : empty ? (
        <div className={styles.empty}>
          هنوز پرستاری برای این مرکز ثبت نشده است.
        </div>
      ) : (
        <div className={styles.scroller}>
          {staff.map(item => (
            <article key={item.id} className={styles.card}>
              <button
                type="button"
                className={styles.cardHit}
                onClick={() => void goToStaff(item.id)}
                aria-label={`مشاهده پروفایل ${item.name}`}
              >
                <div className={styles.cardTop}>
                  {item.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className={styles.avatar}
                      src={item.avatar}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <span className={styles.avatarFallback} aria-hidden>
                      {item.name.slice(0, 1)}
                    </span>
                  )}
                  <span className={styles.rating}>
                    <StarFilledIcon className={styles.ratingStar} />
                    {formatStaffRating(item.rating)}
                  </span>
                </div>
                <h3 className={styles.name}>{item.name}</h3>
                <div className={styles.meta}>
                  <span className={styles.metaText}>
                    {staffTypeLabel(item.type, item.gender)}
                  </span>
                </div>
                <div className={styles.meta}>
                  <span className={styles.metaText}>
                    {formatStaffExperience(item.experience_years)}
                  </span>
                </div>
              </button>
              <button
                type="button"
                className={styles.cta}
                onClick={() => void goToStaff(item.id)}
              >
                مشاهده پرستار
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default CenterStaffSection;
