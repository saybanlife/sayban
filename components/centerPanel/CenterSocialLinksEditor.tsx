import * as React from "react";
import styles from "./CenterPanelFeatures.module.css";
import { usePanelApi } from "./usePanelApi";
import { validateSocialFields } from "../centerPage/centerHelpers";

type CenterSocialLinksEditorProps = {
  centerId?: string | number;
  token?: string;
  instagramUrl?: string;
  websiteUrl?: string;
};

export function CenterSocialLinksEditor({
  centerId,
  token,
  instagramUrl = "",
  websiteUrl = ""
}: CenterSocialLinksEditorProps) {
  const api = usePanelApi(token);
  const [instagram, setInstagram] = React.useState(instagramUrl);
  const [website, setWebsite] = React.useState(websiteUrl);
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setInstagram(instagramUrl || "");
    setWebsite(websiteUrl || "");
  }, [instagramUrl, websiteUrl]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!centerId) return;
    const check = validateSocialFields(instagram, website);
    if (!check.ok) {
      setFormError(check.message);
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await api.updateCenterSocialLinks(
        centerId,
        instagram.trim(),
        website.trim()
      );
    } finally {
      setSaving(false);
    }
  };

  if (!centerId) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <div className={styles.sectionTitle}>اینستاگرام و وب‌سایت</div>
          <p className={styles.sectionHint}>
            این لینک‌ها در بخش موقعیت مکانی صفحه عمومی مرکز نمایش داده می‌شوند.
          </p>
        </div>
      </div>

      <form className={styles.card} onSubmit={handleSave}>
        <div className={styles.formGrid}>
          <label>
            <span className={styles.fieldLabel}>اینستاگرام</span>
            <input
              className={styles.input}
              value={instagram}
              onChange={e => setInstagram(e.target.value.slice(0, 80))}
              placeholder="@username یا https://instagram.com/..."
              dir="ltr"
              maxLength={80}
              autoComplete="url"
              inputMode="url"
            />
          </label>
          <label>
            <span className={styles.fieldLabel}>وب‌سایت</span>
            <input
              className={styles.input}
              value={website}
              onChange={e => setWebsite(e.target.value.slice(0, 2048))}
              placeholder="https://example.com"
              dir="ltr"
              maxLength={2048}
              autoComplete="url"
              inputMode="url"
            />
          </label>
        </div>
        {formError ? <div className={styles.errorText}>{formError}</div> : null}
        <div className={styles.actionsRow}>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={saving}
            aria-busy={saving || undefined}
          >
            {saving ? "در حال ذخیره..." : "ذخیره لینک‌ها"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default CenterSocialLinksEditor;
