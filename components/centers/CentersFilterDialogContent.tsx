import * as React from "react";
import MapPinIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__MapPin";
import CurrentLocationIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__CurrentLocation";
import ClockIcon from "../plasmic/sayban/icons/PlasmicIcon__Clock";
import StarIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Star";
import LockIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Lock";
import CalendarIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Calendar";
import SunIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Sun";
import MoonIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Moon";
import UsersIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Users";
import CalendarClockIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__CalendarClock";
import TrashIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Trash";
import AdjustmentsIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__AdjustmentsHorizontal";
import { AVAILABILITY_FILTER_OPTIONS } from "./centerFilters";
import styles from "./CentersFilterDialog.module.css";
import type { CentersFilterDraft } from "./centerFilters";

const CENTER_TYPE_OPTIONS = [
  { label: "همه", value: "", icon: CalendarIcon },
  { label: "روزانه", value: "day_care", icon: SunIcon },
  { label: "شبانه‌روزی", value: "residential", icon: SunIcon },
  { label: "هر دو", value: "comprehensive", icon: MoonIcon }
] as const;

const NEARBY_OPTIONS = [
  { label: "نزدیک‌ترین به آدرس فعلی", value: "nearby", icon: MapPinIcon },
  { label: "مهم نیست", value: "", icon: CurrentLocationIcon }
] as const;

const AVAILABILITY_ICONS: Record<string, typeof UsersIcon> = {
  any: UsersIcon,
  open_now: LockIcon,
  bookable: CalendarClockIcon
};

function SectionHead({
  title,
  icon: Icon
}: {
  title: string;
  icon: React.ComponentType<{ className?: string; role?: string }>;
}) {
  return (
    <div className={styles.sectionHead}>
      <Icon className={styles.sectionIcon} role="img" />
      <h3 className={styles.sectionTitle}>{title}</h3>
    </div>
  );
}

function RatingStars({
  value,
  onChange
}: {
  value: number;
  onChange: (rate: number) => void;
}) {
  return (
    <div className={styles.stars} role="group" aria-label="امتیاز">
      {[1, 2, 3, 4, 5].map(star => {
        const active = star <= value;
        return (
          <button
            key={star}
            type="button"
            className={`${styles.starBtn}${active ? ` ${styles.starActive}` : ""}`}
            aria-label={`امتیاز ${star} به بالا`}
            aria-pressed={active}
            onClick={() => onChange(star === value ? 0 : star)}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

export type CentersFilterDialogContentProps = {
  draft: CentersFilterDraft;
  nearbyEnabled: boolean;
  onDraftChange: (next: CentersFilterDraft) => void;
  onApply: () => void;
  onClear: () => void;
};

export default function CentersFilterDialogContent({
  draft,
  nearbyEnabled,
  onDraftChange,
  onApply,
  onClear
}: CentersFilterDialogContentProps) {
  const patch = (partial: Partial<CentersFilterDraft>) => {
    onDraftChange({ ...draft, ...partial });
  };

  return (
    <div className={styles.centersFilterPanel}>
      <section className={styles.section}>
        <SectionHead title="فاصله از آدرس فعلی" icon={MapPinIcon} />
        <p className={styles.hint}>
          برای مرتب‌سازی بر اساس فاصله، ابتدا آدرس خود را در بالای صفحه انتخاب
          کنید.
        </p>
        <div className={styles.distanceRow} role="group" aria-label="فاصله از آدرس فعلی">
          {NEARBY_OPTIONS.map(opt => {
            const active = draft.nearby === opt.value;
            const disabled = !nearbyEnabled && opt.value === "nearby";
            const Icon = opt.icon;
            return (
              <button
                key={opt.value || "any"}
                type="button"
                className={`${styles.distanceBtn}${
                  active ? ` ${styles.distanceBtnActive}` : ""
                }${disabled ? ` ${styles.distanceBtnDisabled}` : ""}`}
                aria-pressed={active}
                disabled={disabled}
                onClick={() => patch({ nearby: opt.value })}
              >
                <Icon className={styles.distanceBtnIcon} role="img" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <SectionHead title="زمان فعالیت مرکز" icon={ClockIcon} />
        <div className={styles.pillRow} role="group" aria-label="زمان فعالیت مرکز">
          {CENTER_TYPE_OPTIONS.map(opt => {
            const active = draft.centerType === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value || "all"}
                type="button"
                className={`${styles.pill}${active ? ` ${styles.pillActive}` : ""}`}
                aria-pressed={active}
                onClick={() => patch({ centerType: opt.value })}
              >
                <Icon className={styles.pillIcon} role="img" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <SectionHead title="امتیاز" icon={StarIcon} />
        <RatingStars value={draft.rate} onChange={rate => patch({ rate })} />
        <p className={styles.hint}>
          برای فیلتر بر اساس امتیاز، ستاره‌ها را انتخاب کنید.
        </p>
      </section>

      <section className={styles.section}>
        <SectionHead title="وضعیت دسترسی" icon={LockIcon} />
        <div className={styles.pillRow} role="group" aria-label="وضعیت دسترسی">
          {AVAILABILITY_FILTER_OPTIONS.map(opt => {
            const active = draft.availability === opt.value;
            const Icon = AVAILABILITY_ICONS[opt.value] ?? UsersIcon;
            return (
              <button
                key={opt.value}
                type="button"
                className={`${styles.pill}${active ? ` ${styles.pillActive}` : ""}`}
                aria-pressed={active}
                onClick={() => patch({ availability: opt.value })}
              >
                <Icon className={styles.pillIcon} role="img" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className={styles.footer}>
        <button type="button" className={styles.clearBtn} onClick={onClear}>
          <TrashIcon className={styles.footerIcon} role="img" />
          <span>حذف همه</span>
        </button>
        <button type="button" className={styles.applyBtn} onClick={onApply}>
          <AdjustmentsIcon className={styles.footerIcon} role="img" />
          <span>اعمال فیلتر</span>
        </button>
      </div>
    </div>
  );
}
