import * as React from "react";
import styles from "./CenterPanelFeatures.module.css";
import type {
  NursePricingRule,
  PriceDurationMode,
  PriceRoleMode
} from "../nurseRequest/priceEstimateModel";
import { PLATFORM_NURSE_PRICING_DEFAULTS } from "../nurseRequest/priceEstimateModel";

type CenterNursePricingManagerProps = {
  centerId?: string | number;
  token?: string;
};

const DURATION_OPTIONS: Array<{ id: PriceDurationMode; label: string }> = [
  { id: "once", label: "موردی (یک‌بار)" },
  { id: "continuous", label: "مستمر (مداوم)" }
];

const ROLE_OPTIONS: Array<{ id: PriceRoleMode; label: string }> = [
  { id: "caregiver", label: "مراقب" },
  { id: "nurse", label: "پرستار" },
  { id: "any", label: "هردو / عمومی" }
];

function emptyRule(
  duration: PriceDurationMode,
  role: PriceRoleMode
): NursePricingRule {
  const fallback =
    PLATFORM_NURSE_PRICING_DEFAULTS.find(
      item => item.duration_mode === duration && item.role_mode === role
    ) ||
    PLATFORM_NURSE_PRICING_DEFAULTS.find(
      item => item.duration_mode === duration && item.role_mode === "any"
    );
  return {
    duration_mode: duration,
    role_mode: role,
    base_min: fallback?.base_min || 0,
    base_max: fallback?.base_max || 0,
    currency_label: "تومان",
    price_period: duration === "continuous" ? "monthly" : "service",
    factors: fallback?.factors ? [...fallback.factors] : [],
    note_template: fallback?.note_template || "",
    is_active: true
  };
}

export function CenterNursePricingManager({
  centerId,
  token
}: CenterNursePricingManagerProps) {
  const [rules, setRules] = React.useState<NursePricingRule[]>([]);
  const [draft, setDraft] = React.useState<NursePricingRule>(
    emptyRule("continuous", "caregiver")
  );
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");

  const authHeaders = React.useMemo((): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, [token]);

  const load = React.useCallback(async () => {
    if (!centerId) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/panel/nurse-pricing?centerId=${encodeURIComponent(String(centerId))}`,
        { headers: authHeaders, cache: "no-store" }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "load-failed");
      }
      setRules(Array.isArray(payload.result) ? payload.result : []);
    } catch {
      setError("دریافت قوانین قیمت ممکن نشد.");
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, centerId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!centerId) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/panel/nurse-pricing", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          centerId: Number(centerId),
          ...draft,
          factors: draft.factors || []
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "save-failed");
      }
      setRules(Array.isArray(payload.result) ? payload.result : []);
      setMessage("قیمت ذخیره شد.");
    } catch {
      setError("ذخیره قیمت ممکن نشد.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id?: number) => {
    if (!centerId || !id) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/panel/nurse-pricing", {
        method: "DELETE",
        headers: authHeaders,
        body: JSON.stringify({ centerId: Number(centerId), id })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "delete-failed");
      }
      setRules(Array.isArray(payload.result) ? payload.result : []);
      setMessage("قانون حذف شد.");
    } catch {
      setError("حذف قانون ممکن نشد.");
    } finally {
      setSaving(false);
    }
  };

  if (!centerId) return null;

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>قیمت‌گذاری درخواست مراقب / پرستار</h3>
        <p className={styles.cardHint}>
          قیمت پایه موردی و مستمر را جدا تنظیم کنید. عوامل (factors) بعداً قابل
          گسترش‌اند و روی برآورد تأثیر می‌گذارند.
        </p>
      </div>

      {loading ? <p className={styles.emptyState}>در حال بارگذاری…</p> : null}

      <div className={styles.formGrid}>
        <label>
          <span className={styles.fieldLabel}>نوع خدمت</span>
          <select
            className={styles.input}
            value={draft.duration_mode}
            onChange={e => {
              const duration = e.target.value as PriceDurationMode;
              setDraft(prev => ({
                ...emptyRule(duration, prev.role_mode),
                id: prev.id,
                role_mode: prev.role_mode,
                duration_mode: duration,
                price_period: duration === "continuous" ? "monthly" : "service"
              }));
            }}
          >
            {DURATION_OPTIONS.map(item => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className={styles.fieldLabel}>نقش</span>
          <select
            className={styles.input}
            value={draft.role_mode}
            onChange={e =>
              setDraft(prev => ({
                ...prev,
                role_mode: e.target.value as PriceRoleMode
              }))
            }
          >
            {ROLE_OPTIONS.map(item => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className={styles.fieldLabel}>حداقل قیمت (تومان)</span>
          <input
            className={styles.input}
            inputMode="numeric"
            value={draft.base_min || ""}
            onChange={e =>
              setDraft(prev => ({
                ...prev,
                base_min: Number(String(e.target.value).replace(/\D/g, "")) || 0
              }))
            }
          />
        </label>

        <label>
          <span className={styles.fieldLabel}>حداکثر قیمت (تومان)</span>
          <input
            className={styles.input}
            inputMode="numeric"
            value={draft.base_max || ""}
            onChange={e =>
              setDraft(prev => ({
                ...prev,
                base_max: Number(String(e.target.value).replace(/\D/g, "")) || 0
              }))
            }
          />
        </label>

        <label>
          <span className={styles.fieldLabel}>توضیح زیر قیمت</span>
          <input
            className={styles.input}
            value={draft.note_template || ""}
            onChange={e =>
              setDraft(prev => ({ ...prev, note_template: e.target.value }))
            }
          />
        </label>
      </div>

      <div className={styles.actionsRow}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnPrimary}`}
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "در حال ذخیره…" : "ذخیره قانون قیمت"}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSecondary}`}
          disabled={saving}
          onClick={() =>
            setDraft(emptyRule(draft.duration_mode, draft.role_mode))
          }
        >
          قانون جدید
        </button>
      </div>

      {error ? <p className={styles.errorText}>{error}</p> : null}
      {message ? <p className={styles.successText}>{message}</p> : null}

      <ul className={styles.list}>
        {rules.map(rule => (
          <li
            key={String(rule.id || `${rule.duration_mode}-${rule.role_mode}`)}
            className={styles.listItem}
          >
            <div className={styles.listItemRow}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() =>
                  setDraft({ ...rule, factors: rule.factors || [] })
                }
              >
                <strong className={styles.listItemTitle}>
                  {rule.duration_mode === "once" ? "موردی" : "مستمر"} ·{" "}
                  {rule.role_mode === "caregiver"
                    ? "مراقب"
                    : rule.role_mode === "nurse"
                      ? "پرستار"
                      : "عمومی"}
                </strong>
                <span className={styles.listItemBody}>
                  {Number(rule.base_min).toLocaleString("fa-IR")} تا{" "}
                  {Number(rule.base_max).toLocaleString("fa-IR")} تومان
                  {rule.price_period === "monthly" ? " / ماهانه" : ""}
                </span>
              </button>
              {rule.id ? (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnDanger}`}
                  disabled={saving}
                  onClick={() => void remove(rule.id)}
                >
                  حذف
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default CenterNursePricingManager;
