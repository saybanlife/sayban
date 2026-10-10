import * as React from "react";

import {
  staffServiceDurationLabel,
  type StaffServiceDurationMode
} from "../nurseRequest/staffServiceDuration";
import styles from "./CenterStaffServicesDurationManager.module.css";

type CatalogService = {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  duration_mode: StaffServiceDurationMode | null;
};

type Props = {
  token?: string;
  className?: string;
};

const CATEGORY_FA: Record<string, string> = {
  general: "عمومی",
  specialized: "تخصصی"
};

export default function CenterStaffServicesDurationManager({
  token,
  className
}: Props) {
  const [items, setItems] = React.useState<CatalogService[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState<number | null>(null);
  const [error, setError] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "general" | "specialized">(
    "all"
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs =
        filter === "all" ? "" : `?category=${encodeURIComponent(filter)}`;
      const response = await fetch(`/api/panel/staff-services${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store"
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "load-failed");
      }
      setItems(Array.isArray(payload.result) ? payload.result : []);
    } catch {
      setError("بارگذاری خدمات ممکن نشد.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter, token]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const save = async (
    id: number,
    duration_mode: StaffServiceDurationMode | null
  ) => {
    setSavingId(id);
    setError("");
    try {
      const response = await fetch("/api/panel/staff-services", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ id, duration_mode })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "save-failed");
      }
      setItems(prev =>
        prev.map(item =>
          item.id === id
            ? { ...item, duration_mode: payload.result?.duration_mode ?? null }
            : item
        )
      );
    } catch {
      setError("ذخیره نوع خدمت (یک‌بار/مداوم) ناموفق بود.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className={[styles.root, className].filter(Boolean).join(" ")}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>نوع ارائه خدمت (یک‌بار / مداوم)</h2>
          <p className={styles.hint}>
            برای هر خدمت پرستاری مشخص کنید درخواست‌کننده فقط در حالت «یک‌بار»
            یا «مداوم» آن را ببیند. خالی = در هر دو حالت نمایش داده می‌شود.
          </p>
        </div>
        <div className={styles.filters}>
          {(
            [
              ["all", "همه"],
              ["general", "عمومی"],
              ["specialized", "تخصصی"]
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={filter === value ? styles.chipOn : styles.chip}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {loading ? <p className={styles.muted}>در حال بارگذاری…</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {!loading && items.length === 0 ? (
        <p className={styles.muted}>خدمتی یافت نشد.</p>
      ) : null}

      <ul className={styles.list}>
        {items.map(item => (
          <li key={item.id} className={styles.row}>
            <div className={styles.meta}>
              <strong>{item.name}</strong>
              <span className={styles.cat}>
                {CATEGORY_FA[String(item.category || "")] || item.category || "—"}
              </span>
            </div>
            <div className={styles.modes} role="group" aria-label={item.name}>
              {(
                [
                  [null, "هر دو"],
                  ["once", "یک‌بار"],
                  ["continuous", "مداوم"]
                ] as const
              ).map(([value, label]) => {
                const selected =
                  (value === null && item.duration_mode == null) ||
                  item.duration_mode === value;
                return (
                  <button
                    key={String(value)}
                    type="button"
                    disabled={savingId === item.id}
                    className={selected ? styles.modeOn : styles.mode}
                    onClick={() => void save(item.id, value)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {item.duration_mode ? (
              <span className={styles.badge}>
                {staffServiceDurationLabel(item.duration_mode)}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
