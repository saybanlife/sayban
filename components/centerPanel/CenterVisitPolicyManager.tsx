import * as React from "react";
import styles from "./CenterPanelFeatures.module.css";
import { asPanelBool, type VisitPolicyRow } from "./panelApi";
import { usePanelApi } from "./usePanelApi";
import { sanitizeDigits } from "../formFieldRules";

type CenterVisitPolicyManagerProps = {
  centerId?: string | number;
  token?: string;
  compact?: boolean;
};

const EMPTY_POLICY: VisitPolicyRow = {
  visit_days: "",
  visit_hours: "",
  needs_prior_coordination: false,
  max_visitors_count: "",
  allows_private_visit: false,
  allows_open_space_visit: false,
  allows_phone_contact: false,
  allows_video_contact: false,
  contact_hours: "",
  allows_temporary_leave: false,
  temporary_leave_conditions: "",
  allows_overnight_leave: false,
  status_report_method: "",
  status_report_frequency: "",
  contact_person_role: "",
  allows_direct_staff_contact: false,
  complaint_method: "",
  complaint_response_time: ""
};

function boolField(
  label: string,
  checked: boolean,
  onChange: (value: boolean) => void
) {
  return (
    <label className={styles.switchRow}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
    </label>
  );
}

export function CenterVisitPolicyManager({
  centerId,
  token,
  compact = false
}: CenterVisitPolicyManagerProps) {
  const api = usePanelApi(token);
  const [policy, setPolicy] = React.useState<VisitPolicyRow>(EMPTY_POLICY);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const loadData = React.useCallback(async () => {
    if (!centerId) return;
    setLoading(true);
    try {
      const row = await api.fetchVisitPolicy(centerId);
      setPolicy({
        ...EMPTY_POLICY,
        ...(row || {}),
        visit_days: row?.visit_days || "",
        visit_hours: row?.visit_hours || "",
        max_visitors_count:
          row?.max_visitors_count != null ? String(row.max_visitors_count) : "",
        contact_hours: row?.contact_hours || "",
        temporary_leave_conditions: row?.temporary_leave_conditions || "",
        status_report_method: row?.status_report_method || "",
        status_report_frequency: row?.status_report_frequency || "",
        contact_person_role: row?.contact_person_role || "",
        complaint_method: row?.complaint_method || "",
        complaint_response_time: row?.complaint_response_time || "",
        needs_prior_coordination: asPanelBool(row?.needs_prior_coordination),
        allows_private_visit: asPanelBool(row?.allows_private_visit),
        allows_open_space_visit: asPanelBool(row?.allows_open_space_visit),
        allows_phone_contact: asPanelBool(row?.allows_phone_contact),
        allows_video_contact: asPanelBool(row?.allows_video_contact),
        allows_temporary_leave: asPanelBool(row?.allows_temporary_leave),
        allows_overnight_leave: asPanelBool(row?.allows_overnight_leave),
        allows_direct_staff_contact: asPanelBool(
          row?.allows_direct_staff_contact
        )
      });
    } finally {
      setLoading(false);
    }
  }, [api, centerId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const setField = <K extends keyof VisitPolicyRow>(
    key: K,
    value: VisitPolicyRow[K]
  ) => {
    setPolicy(current => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!centerId) return;
    setSaving(true);
    try {
      const ok = await api.updateVisitPolicy({
        center_id: centerId,
        visit_days: policy.visit_days || null,
        visit_hours: policy.visit_hours || null,
        needs_prior_coordination: Boolean(policy.needs_prior_coordination),
        max_visitors_count: policy.max_visitors_count
          ? Number(policy.max_visitors_count)
          : null,
        allows_private_visit: Boolean(policy.allows_private_visit),
        allows_open_space_visit: Boolean(policy.allows_open_space_visit),
        allows_phone_contact: Boolean(policy.allows_phone_contact),
        allows_video_contact: Boolean(policy.allows_video_contact),
        contact_hours: policy.contact_hours || null,
        allows_temporary_leave: Boolean(policy.allows_temporary_leave),
        temporary_leave_conditions: policy.temporary_leave_conditions || null,
        allows_overnight_leave: Boolean(policy.allows_overnight_leave),
        status_report_method: policy.status_report_method || null,
        status_report_frequency: policy.status_report_frequency || null,
        contact_person_role: policy.contact_person_role || null,
        allows_direct_staff_contact: Boolean(
          policy.allows_direct_staff_contact
        ),
        complaint_method: policy.complaint_method || null,
        complaint_response_time: policy.complaint_response_time || null
      });
      if (ok) await loadData();
    } finally {
      setSaving(false);
    }
  };

  if (!centerId) return null;

  return (
    <section
      className={`${styles.section}${compact ? ` ${styles.sectionCompact}` : ""}`}
    >
      {!compact ? (
        <div className={styles.sectionHeader}>
          <div>
            <div className={styles.sectionTitle}>ملاقات و ارتباط با خانواده</div>
            <p className={styles.sectionHint}>
              سیاست ملاقات، تماس و ارتباط با خانواده را تنظیم کنید.
            </p>
          </div>
        </div>
      ) : null}

      <form className={styles.card} onSubmit={handleSubmit}>
        {loading ? (
          <div className={styles.emptyState}>در حال بارگذاری...</div>
        ) : (
          <div className={styles.formGrid}>
            <label>
              <span className={styles.fieldLabel}>روزهای ملاقات</span>
              <input
                className={styles.input}
                value={String(policy.visit_days || "")}
                onChange={e => setField("visit_days", e.target.value)}
                placeholder="مثلاً همه روزها"
                maxLength={80}
              />
            </label>
            <label>
              <span className={styles.fieldLabel}>ساعات ملاقات</span>
              <input
                className={styles.input}
                value={String(policy.visit_hours || "")}
                onChange={e => setField("visit_hours", e.target.value)}
                placeholder="مثلاً ۱۰:۰۰ — ۱۹:۰۰"
                maxLength={40}
              />
            </label>
            {boolField(
              "نیاز به هماهنگی قبلی",
              Boolean(policy.needs_prior_coordination),
              value => setField("needs_prior_coordination", value)
            )}
            <label>
              <span className={styles.fieldLabel}>حداکثر تعداد بازدیدکننده</span>
              <input
                className={styles.input}
                inputMode="numeric"
                maxLength={2}
                value={String(policy.max_visitors_count || "")}
                onChange={e =>
                  setField("max_visitors_count", sanitizeDigits(e.target.value, 2))
                }
                placeholder="مثلاً ۳"
              />
            </label>
            {boolField(
              "ملاقات خصوصی",
              Boolean(policy.allows_private_visit),
              value => setField("allows_private_visit", value)
            )}
            {boolField(
              "ملاقات در فضای باز",
              Boolean(policy.allows_open_space_visit),
              value => setField("allows_open_space_visit", value)
            )}
            {boolField(
              "تماس تلفنی",
              Boolean(policy.allows_phone_contact),
              value => setField("allows_phone_contact", value)
            )}
            {boolField(
              "تماس تصویری",
              Boolean(policy.allows_video_contact),
              value => setField("allows_video_contact", value)
            )}
            <label>
              <span className={styles.fieldLabel}>ساعات تماس</span>
              <input
                className={styles.input}
                value={String(policy.contact_hours || "")}
                onChange={e => setField("contact_hours", e.target.value)}
                placeholder="مثلاً ۹ تا ۲۰"
                maxLength={40}
              />
            </label>
            {boolField(
              "مرخصی موقت",
              Boolean(policy.allows_temporary_leave),
              value => setField("allows_temporary_leave", value)
            )}
            <label>
              <span className={styles.fieldLabel}>شرایط مرخصی موقت</span>
              <textarea
                className={styles.textarea}
                value={String(policy.temporary_leave_conditions || "")}
                onChange={e =>
                  setField("temporary_leave_conditions", e.target.value)
                }
                placeholder="مثلاً با هماهنگی قبلی و همراهی خانواده"
                maxLength={500}
              />
            </label>
            {boolField(
              "مرخصی شبانه",
              Boolean(policy.allows_overnight_leave),
              value => setField("allows_overnight_leave", value)
            )}
            <label>
              <span className={styles.fieldLabel}>روش گزارش وضعیت</span>
              <input
                className={styles.input}
                value={String(policy.status_report_method || "")}
                onChange={e => setField("status_report_method", e.target.value)}
                placeholder="مثلاً تماس تلفنی یا پیامک"
                maxLength={80}
              />
            </label>
            <label>
              <span className={styles.fieldLabel}>تناوب گزارش وضعیت</span>
              <input
                className={styles.input}
                value={String(policy.status_report_frequency || "")}
                onChange={e =>
                  setField("status_report_frequency", e.target.value)
                }
                placeholder="مثلاً روزانه یا هفتگی"
                maxLength={40}
              />
            </label>
            <label>
              <span className={styles.fieldLabel}>نقش فرد پاسخگو</span>
              <input
                className={styles.input}
                value={String(policy.contact_person_role || "")}
                onChange={e => setField("contact_person_role", e.target.value)}
                placeholder="مثلاً مسئول پذیرش"
                maxLength={80}
              />
            </label>
            {boolField(
              "ارتباط مستقیم با کادر",
              Boolean(policy.allows_direct_staff_contact),
              value => setField("allows_direct_staff_contact", value)
            )}
            <label>
              <span className={styles.fieldLabel}>روش ثبت شکایت</span>
              <input
                className={styles.input}
                value={String(policy.complaint_method || "")}
                onChange={e => setField("complaint_method", e.target.value)}
              />
            </label>
            <label>
              <span className={styles.fieldLabel}>زمان پاسخ به شکایت</span>
              <input
                className={styles.input}
                value={String(policy.complaint_response_time || "")}
                onChange={e =>
                  setField("complaint_response_time", e.target.value)
                }
              />
            </label>
          </div>
        )}
        <div className={styles.actionsRow}>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={saving || loading}
          >
            {saving ? "در حال ذخیره…" : "ذخیره سیاست ملاقات"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default CenterVisitPolicyManager;
