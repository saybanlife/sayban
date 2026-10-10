import * as React from "react";
import Modal from "../Modal";
import { usePanelApi } from "./usePanelApi";
import styles from "./CenterFactsPanels.module.css";
import PanelOptionSelect from "./PanelOptionSelect";
import CoverageAreasField from "./CoverageAreasField";
import {
  ACTIVITY_DAY_OPTIONS,
  ADMISSION_GENDER_OPTIONS,
  CARE_DOMAIN_OPTIONS,
  CAREGIVER_TYPE_OPTIONS,
  CENTER_TYPE_OPTIONS,
  DISPATCH_LEAD_TIME_OPTIONS,
  DISPATCH_WORKFORCE_EXPERIENCE_OPTIONS,
  DISPATCH_WORKFORCE_TOP_OPTIONS,
  DOCTOR_TYPE_OPTIONS,
  EMPTY_GLANCE_FACTS,
  EMPTY_OVERVIEW_FACTS,
  LICENSE_TYPE_OPTIONS,
  MIN_WORK_EXPERIENCE_UNIT_OPTIONS,
  ROOM_TYPE_OPTIONS,
  URGENT_DISPATCH_OPTIONS,
  factsFromCenterResult,
  glanceDisplayRows,
  glanceFactsPayload,
  isNursingGlanceProfile,
  overviewDisplayRows,
  overviewFactsPayload,
  validateGlanceFacts,
  validateOverviewFacts,
  type ActivityDayOption,
  type CenterGlanceFacts,
  type CenterOverviewFacts,
  type DispatchWorkforceOption,
  type RoomTypeOption
} from "./centerFactsSchema";
import { sanitizeDecimal, sanitizeDigits } from "../formFieldRules";
import TimeField from "../datetime/PanelTimePicker";

type CenterFactsPanelsProps = {
  centerId?: string | number;
  token?: string;
  /** When true, render overview+glance as one stacked block without outer titles/dividers. */
  unified?: boolean;
  onSaved?: () => void;
};

type ModalKind = "overview" | "glance" | null;

export function CenterFactsPanels({
  centerId,
  token,
  unified = false,
  onSaved
}: CenterFactsPanelsProps) {
  const api = usePanelApi(token);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [overview, setOverview] = React.useState<CenterOverviewFacts>(
    EMPTY_OVERVIEW_FACTS
  );
  const [glance, setGlance] = React.useState<CenterGlanceFacts>(
    EMPTY_GLANCE_FACTS
  );
  const [draftOverview, setDraftOverview] =
    React.useState<CenterOverviewFacts>(EMPTY_OVERVIEW_FACTS);
  const [draftGlance, setDraftGlance] =
    React.useState<CenterGlanceFacts>(EMPTY_GLANCE_FACTS);
  const [openModal, setOpenModal] = React.useState<ModalKind>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const loadFacts = React.useCallback(async () => {
    if (!centerId) return;
    setLoading(true);
    try {
      const result = await api.fetchCenterFacts(centerId);
      const next = factsFromCenterResult(result);
      setOverview(next.overview);
      setGlance(next.glance);
    } finally {
      setLoading(false);
    }
  }, [api, centerId]);

  React.useEffect(() => {
    loadFacts();
  }, [loadFacts]);

  const openOverviewEditor = () => {
    setDraftOverview({
      ...overview,
      dispatch_tehran_districts: [...overview.dispatch_tehran_districts],
      activity_days: [...overview.activity_days]
    });
    setFormError(null);
    setOpenModal("overview");
  };

  const openGlanceEditor = () => {
    setDraftGlance({
      ...glance,
      room_types: [...glance.room_types],
      dispatch_workforce_types: [...glance.dispatch_workforce_types]
    });
    setFormError(null);
    setOpenModal("glance");
  };

  const closeModal = () => {
    if (saving) return;
    setOpenModal(null);
    setFormError(null);
  };

  const handleSaveOverview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!centerId) return;
    const error = validateOverviewFacts(draftOverview);
    if (error) {
      setFormError(error);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      let payload: Record<string, unknown>;
      try {
        payload = overviewFactsPayload(draftOverview);
      } catch {
        setFormError("مقادیر انتخاب‌شده قابل ذخیره نیستند. دوباره انتخاب کنید.");
        return;
      }
      const ok = await api.updateCenterFacts(centerId, payload);
      if (ok) {
        setOverview({
          ...draftOverview,
          dispatch_tehran_districts: [...draftOverview.dispatch_tehran_districts],
          activity_days: [...draftOverview.activity_days]
        });
        setOpenModal(null);
        onSaved?.();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGlance = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!centerId) return;
    const careDomain = overview.care_domain;
    const error = validateGlanceFacts(draftGlance, careDomain);
    if (error) {
      setFormError(error);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      let payload: Record<string, unknown>;
      try {
        payload = glanceFactsPayload(draftGlance, careDomain);
      } catch {
        setFormError("مقادیر انتخاب‌شده قابل ذخیره نیستند. دوباره انتخاب کنید.");
        return;
      }
      const ok = await api.updateCenterFacts(centerId, payload);
      if (ok) {
        setGlance({
          ...draftGlance,
          room_types: [...draftGlance.room_types],
          dispatch_workforce_types: [
            ...draftGlance.dispatch_workforce_types
          ]
        });
        setOpenModal(null);
        onSaved?.();
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleRoomType = (option: RoomTypeOption) => {
    setDraftGlance(current => {
      const exists = current.room_types.includes(option);
      return {
        ...current,
        room_types: exists
          ? current.room_types.filter(item => item !== option)
          : [...current.room_types, option]
      };
    });
  };

  const toggleActivityDay = (option: ActivityDayOption) => {
    setDraftOverview(current => {
      const exists = current.activity_days.includes(option);
      return {
        ...current,
        activity_days: exists
          ? current.activity_days.filter(item => item !== option)
          : [...current.activity_days, option]
      };
    });
  };

  const toggleDispatchWorkforce = (option: DispatchWorkforceOption) => {
    setDraftGlance(current => {
      const exists = current.dispatch_workforce_types.includes(option);
      return {
        ...current,
        dispatch_workforce_types: exists
          ? current.dispatch_workforce_types.filter(item => item !== option)
          : [...current.dispatch_workforce_types, option]
      };
    });
  };

  if (!centerId) return null;

  const nursingGlance = isNursingGlanceProfile(overview.care_domain);
  const overviewRows = overviewDisplayRows(overview);
  const glanceRows = glanceDisplayRows(glance, overview.care_domain);

  return (
    <div className={styles.stack}>
      {!unified ? <hr className={styles.divider} /> : null}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>اطلاعات کلی</div>
          <button
            type="button"
            className={styles.editLink}
            onClick={openOverviewEditor}
            disabled={loading || saving}
          >
            ویرایش
          </button>
        </div>
        {loading ? (
          <div className={styles.loadingText}>در حال بارگذاری…</div>
        ) : (
          <div className={styles.rows}>
            {overviewRows.map(row => (
              <div className={styles.row} key={row.key}>
                <span className={styles.rowLabel}>{row.label} : </span>
                <span className={styles.rowValue}>{row.value}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <hr className={styles.divider} />
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>اطلاعات کلیدی در یک نگاه</div>
          <button
            type="button"
            className={styles.editLink}
            onClick={openGlanceEditor}
            disabled={loading || saving}
          >
            ویرایش
          </button>
        </div>
        {loading ? (
          <div className={styles.loadingText}>در حال بارگذاری…</div>
        ) : (
          <div className={styles.rows}>
            {glanceRows.map(row => (
              <div className={styles.row} key={row.key}>
                <span className={styles.rowLabel}>{row.label} : </span>
                <span className={styles.rowValue}>{row.value}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <Modal
        closeOnBackdropClick={!saving}
        overrides={{
          ariaDialog: { className: styles.modalDialog }
        }}
        content={
          <form className={styles.modalForm} onSubmit={handleSaveOverview}>
            <div className={styles.formGrid}>
              <label>
                <span className={styles.fieldLabel}>زمان فعالیت مرکز</span>
                <PanelOptionSelect
                  label="زمان فعالیت مرکز"
                  value={draftOverview.center_type}
                  options={CENTER_TYPE_OPTIONS}
                  onChange={center_type =>
                    setDraftOverview(current => ({
                      ...current,
                      center_type
                    }))
                  }
                />
                <span className={styles.fieldHint}>
                  فیلتر روزانه و شبانه‌روزی در فهرست مراکز بر اساس همین مقدار
                  کار می‌کند.
                </span>
              </label>
              <label>
                <span className={styles.fieldLabel}>نوع مراقبت</span>
                <PanelOptionSelect
                  label="نوع مراقبت"
                  value={draftOverview.care_domain}
                  options={CARE_DOMAIN_OPTIONS}
                  onChange={care_domain =>
                    setDraftOverview(current => ({
                      ...current,
                      care_domain
                    }))
                  }
                />
              </label>
              <label>
                <span className={styles.fieldLabel}>پذیرش</span>
                <PanelOptionSelect
                  label="پذیرش"
                  value={draftOverview.admission_gender}
                  options={ADMISSION_GENDER_OPTIONS}
                  onChange={admission_gender =>
                    setDraftOverview(current => ({
                      ...current,
                      admission_gender
                    }))
                  }
                />
              </label>
              {isNursingGlanceProfile(draftOverview.care_domain) ? (
                <>
                  <label>
                    <span className={styles.fieldLabel}>تعداد نیروی فعال</span>
                    <input
                      className={styles.input}
                      inputMode="numeric"
                      maxLength={4}
                      value={draftOverview.active_staff_count}
                      onChange={e =>
                        setDraftOverview(current => ({
                          ...current,
                          active_staff_count: sanitizeDigits(e.target.value, 4)
                        }))
                      }
                      placeholder="مثلاً ۲۵"
                    />
                  </label>
                  <div>
                    <span className={styles.fieldLabel}>حداقل سابقه کاری</span>
                    <div className={styles.inlineUnitRow}>
                      <input
                        className={styles.input}
                        inputMode="numeric"
                        maxLength={3}
                        value={draftOverview.min_work_experience_value}
                        onChange={e =>
                          setDraftOverview(current => ({
                            ...current,
                            min_work_experience_value: sanitizeDigits(
                              e.target.value,
                              3
                            )
                          }))
                        }
                        placeholder="مثلاً ۶"
                      />
                      <div className={styles.chipGroup}>
                        {MIN_WORK_EXPERIENCE_UNIT_OPTIONS.map(option => {
                          const active =
                            draftOverview.min_work_experience_unit === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              className={`${styles.chip}${
                                active ? ` ${styles.chipActive}` : ""
                              }`}
                              onClick={() =>
                                setDraftOverview(current => ({
                                  ...current,
                                  min_work_experience_unit: option
                                }))
                              }
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className={styles.fieldLabel}>مناطق تحت پوشش</span>
                    <CoverageAreasField
                      label="مناطق تحت پوشش"
                      value={draftOverview.dispatch_tehran_districts}
                      onChange={dispatch_tehran_districts =>
                        setDraftOverview(current => ({
                          ...current,
                          dispatch_tehran_districts
                        }))
                      }
                    />
                  </div>
                  <label>
                    <span className={styles.fieldLabel}>
                      حداقل زمان لازم برای اعزام نیرو چقدر است؟
                    </span>
                    <PanelOptionSelect
                      label="حداقل زمان لازم برای اعزام نیرو چقدر است؟"
                      value={draftOverview.dispatch_lead_time}
                      options={DISPATCH_LEAD_TIME_OPTIONS}
                      onChange={dispatch_lead_time =>
                        setDraftOverview(current => ({
                          ...current,
                          dispatch_lead_time
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span className={styles.fieldLabel}>
                      آیا اعزام فوری دارید؟
                    </span>
                    <PanelOptionSelect
                      label="آیا اعزام فوری دارید؟"
                      value={draftOverview.urgent_dispatch}
                      options={URGENT_DISPATCH_OPTIONS}
                      onChange={urgent_dispatch =>
                        setDraftOverview(current => ({
                          ...current,
                          urgent_dispatch
                        }))
                      }
                    />
                  </label>
                  <div>
                    <span className={styles.fieldLabel}>
                      روزهای فعالیت مرکز چیست؟
                    </span>
                    <div className={styles.chipGroup}>
                      {ACTIVITY_DAY_OPTIONS.map(option => {
                        const active =
                          draftOverview.activity_days.includes(option);
                        return (
                          <button
                            key={option}
                            type="button"
                            className={`${styles.chip}${
                              active ? ` ${styles.chipActive}` : ""
                            }`}
                            onClick={() => toggleActivityDay(option)}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <span className={styles.fieldLabel}>
                      ساعات پاسخ‌گویی چیست؟
                    </span>
                    <div className={styles.formGrid}>
                      <TimeField
                        id="overview-response-start"
                        label="ساعت شروع"
                        inline
                        value={draftOverview.response_hours_start}
                        onChange={response_hours_start =>
                          setDraftOverview(current => ({
                            ...current,
                            response_hours_start
                          }))
                        }
                      />
                      <TimeField
                        id="overview-response-end"
                        label="ساعت پایان"
                        inline
                        value={draftOverview.response_hours_end}
                        onChange={response_hours_end =>
                          setDraftOverview(current => ({
                            ...current,
                            response_hours_end
                          }))
                        }
                      />
                    </div>
                  </div>
                </>
              ) : (
                <label>
                  <span className={styles.fieldLabel}>ظرفیت کل مرکز</span>
                  <input
                    className={styles.input}
                    inputMode="numeric"
                    maxLength={4}
                    value={draftOverview.total_capacity}
                    onChange={e =>
                      setDraftOverview(current => ({
                        ...current,
                        total_capacity: sanitizeDigits(e.target.value, 4)
                      }))
                    }
                    placeholder="مثلاً ۸۴"
                  />
                </label>
              )}
              <label>
                <span className={styles.fieldLabel}>سال تأسیس</span>
                <input
                  className={styles.input}
                  inputMode="numeric"
                  maxLength={4}
                  value={draftOverview.founded_year}
                  onChange={e =>
                    setDraftOverview(current => ({
                      ...current,
                      founded_year: sanitizeDigits(e.target.value, 4)
                    }))
                  }
                  placeholder="مثلاً ۱۳۹۲"
                />
              </label>
              <label>
                <span className={styles.fieldLabel}>تعداد کادر مراقبتی</span>
                <input
                  className={styles.input}
                  inputMode="numeric"
                  maxLength={4}
                  value={draftOverview.care_staff_count}
                  onChange={e =>
                    setDraftOverview(current => ({
                      ...current,
                      care_staff_count: sanitizeDigits(e.target.value, 4)
                    }))
                  }
                  placeholder="مثلاً ۲۶"
                />
              </label>
            </div>
            {formError ? (
              <div className={styles.errorText}>{formError}</div>
            ) : null}
            <div className={styles.actionsRow}>
              <button
                type="submit"
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={saving}
                aria-busy={saving || undefined}
              >
                {saving ? "در حال ذخیره…" : "ذخیره"}
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={closeModal}
                disabled={saving}
              >
                انصراف
              </button>
            </div>
          </form>
        }
        heading="ویرایش اطلاعات کلی"
        isOpen={openModal === "overview"}
        noTrigger={true}
        onOpenChange={open => {
          if (!open) closeModal();
          else setOpenModal("overview");
        }}
        showFooter={false}
        showHeader={true}
        trigger={null}
      />

      <Modal
        closeOnBackdropClick={!saving}
        overrides={{
          ariaDialog: { className: styles.modalDialog }
        }}
        content={
          <form className={styles.modalForm} onSubmit={handleSaveGlance}>
            <div className={styles.formGrid}>
              <label>
                <span className={styles.fieldLabel}>حداقل هزینه ماهانه</span>
                <input
                  className={styles.input}
                  inputMode="decimal"
                  maxLength={12}
                  value={draftGlance.min_monthly_fee}
                  onChange={e =>
                    setDraftGlance(current => ({
                      ...current,
                      min_monthly_fee: sanitizeDigits(e.target.value, 12)
                    }))
                  }
                  placeholder="مثلاً ۱۸۰۰۰۰۰۰"
                />
              </label>
              <label>
                <span className={styles.fieldLabel}>حداکثر هزینه ماهانه</span>
                <input
                  className={styles.input}
                  inputMode="decimal"
                  maxLength={12}
                  value={draftGlance.max_monthly_fee}
                  onChange={e =>
                    setDraftGlance(current => ({
                      ...current,
                      max_monthly_fee: sanitizeDigits(e.target.value, 12)
                    }))
                  }
                  placeholder="مثلاً ۳۵۰۰۰۰۰۰"
                />
              </label>
              <div className={styles.switchRow}>
                <span className={`${styles.fieldLabel} ${styles.switchLabel}`}>
                  حضور پرستار شبانه‌روزی
                </span>
                <input
                  type="checkbox"
                  checked={draftGlance.has_night_nurse}
                  onChange={e =>
                    setDraftGlance(current => ({
                      ...current,
                      has_night_nurse: e.target.checked
                    }))
                  }
                />
              </div>
              {nursingGlance ? (
                <>
                  <div>
                    <span className={styles.fieldLabel}>
                      نوع نیروی قابل اعزام
                    </span>
                    <div className={styles.chipGroup}>
                      {DISPATCH_WORKFORCE_TOP_OPTIONS.map(option => {
                        const active =
                          draftGlance.dispatch_workforce_types.includes(
                            option as DispatchWorkforceOption
                          );
                        return (
                          <button
                            key={option}
                            type="button"
                            className={`${styles.chip}${
                              active ? ` ${styles.chipActive}` : ""
                            }`}
                            onClick={() =>
                              toggleDispatchWorkforce(
                                option as DispatchWorkforceOption
                              )
                            }
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                    <span className={styles.fieldHint}>
                      پرستار دارای تجربه مراقبت از:
                    </span>
                    <div className={styles.chipGroup}>
                      {DISPATCH_WORKFORCE_EXPERIENCE_OPTIONS.map(option => {
                        const active =
                          draftGlance.dispatch_workforce_types.includes(
                            option as DispatchWorkforceOption
                          );
                        return (
                          <button
                            key={option}
                            type="button"
                            className={`${styles.chip}${
                              active ? ` ${styles.chipActive}` : ""
                            }`}
                            onClick={() =>
                              toggleDispatchWorkforce(
                                option as DispatchWorkforceOption
                              )
                            }
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <label>
                    <span className={styles.fieldLabel}>
                        نوع مجوز یا وضعیت قانونی مرکز چیست؟
                    </span>
                    <PanelOptionSelect
                      label="نوع مجوز یا وضعیت قانونی مرکز چیست؟"
                      value={draftGlance.license_type}
                      options={LICENSE_TYPE_OPTIONS}
                      onChange={license_type =>
                        setDraftGlance(current => ({
                          ...current,
                          license_type
                        }))
                      }
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    <span className={styles.fieldLabel}>
                      نزدیکی به بیمارستان (کیلومتر)
                    </span>
                    <input
                      className={styles.input}
                      inputMode="decimal"
                      maxLength={6}
                      value={draftGlance.distance_to_hospital_km}
                      onChange={e =>
                        setDraftGlance(current => ({
                          ...current,
                          distance_to_hospital_km: sanitizeDecimal(
                            e.target.value,
                            6
                          )
                        }))
                      }
                      placeholder="مثلاً ۲.۵"
                    />
                  </label>
                  <label>
                    <span className={styles.fieldLabel}>نوع پزشک</span>
                    <PanelOptionSelect
                      label="نوع پزشک"
                      value={draftGlance.doctor_type}
                      options={DOCTOR_TYPE_OPTIONS}
                      onChange={doctor_type =>
                        setDraftGlance(current => ({
                          ...current,
                          doctor_type
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span className={styles.fieldLabel}>
                      نوع مراقب یا پرستار
                    </span>
                    <PanelOptionSelect
                      label="نوع مراقب یا پرستار"
                      value={draftGlance.caregiver_type}
                      options={CAREGIVER_TYPE_OPTIONS}
                      onChange={caregiver_type =>
                        setDraftGlance(current => ({
                          ...current,
                          caregiver_type
                        }))
                      }
                    />
                  </label>
                  <div>
                    <span className={styles.fieldLabel}>نوع اتاق‌ها</span>
                    <div className={styles.chipGroup}>
                      {ROOM_TYPE_OPTIONS.map(option => {
                        const active =
                          draftGlance.room_types.includes(option);
                        return (
                          <button
                            key={option}
                            type="button"
                            className={`${styles.chip}${
                              active ? ` ${styles.chipActive}` : ""
                            }`}
                            onClick={() => toggleRoomType(option)}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
            {formError ? (
              <div className={styles.errorText}>{formError}</div>
            ) : null}
            <div className={styles.actionsRow}>
              <button
                type="submit"
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={saving}
                aria-busy={saving || undefined}
              >
                {saving ? "در حال ذخیره…" : "ذخیره"}
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={closeModal}
                disabled={saving}
              >
                انصراف
              </button>
            </div>
          </form>
        }
        heading="ویرایش اطلاعات کلیدی"
        isOpen={openModal === "glance"}
        noTrigger={true}
        onOpenChange={open => {
          if (!open) closeModal();
          else setOpenModal("glance");
        }}
        showFooter={false}
        showHeader={true}
        trigger={null}
      />
    </div>
  );
}

export default CenterFactsPanels;
