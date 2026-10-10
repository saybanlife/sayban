import * as React from "react";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import { PANEL_ROUTES, resolveApiUrl } from "@/lib/apiRoutes";
import Button from "./Button";
import styles from "./MainPageHomeSlider.module.css";
import localStyles from "./MainPageSendNotif.module.css";

type MainPageSendNotifProps = {
  token?: string;
  className?: string;
};

type AudienceMode = "all" | "users" | "panel" | "panel_users";

const NOTIF_TYPES: Array<{ value: string; label: string }> = [
  { value: "system", label: "سیستمی" },
  { value: "promotion", label: "پروموشن" },
  { value: "reminder", label: "یادآوری" },
  { value: "other", label: "سایر" }
];

type FormState = {
  title: string;
  text: string;
  action: string;
  notification_type: string;
  audience: AudienceMode;
  userIds: string;
  isSaveData: boolean;
};

const EMPTY_FORM: FormState = {
  title: "",
  text: "",
  action: "/",
  notification_type: "system",
  audience: "all",
  userIds: "",
  isSaveData: true
};

function parseIds(raw: string): number[] {
  return raw
    .split(/[\s,،;]+/)
    .map(part => Number(part.trim()))
    .filter(id => Number.isFinite(id) && id > 0);
}

/**
 * Sends via n8n `notification` workflow webhooks (API_BASE_URL), not the app origin.
 * - app users → `send-notif`
 * - panel staff → `send-notif-panel`
 */
async function sendNotification(
  token: string | undefined,
  body: Record<string, unknown>,
  audience: AudienceMode
) {
  const path =
    audience === "panel" || audience === "panel_users"
      ? PANEL_ROUTES.sendNotifPanel
      : PANEL_ROUTES.sendNotif;
  const res = await fetch(resolveApiUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

/**
 * Super Admin «ارسال اعلان» — live `send-notif` / `send-notif-panel` webhooks.
 */
export function MainPageSendNotif({
  token,
  className
}: MainPageSendNotifProps) {
  const globalActions = useGlobalActions();
  const toast = (type: "success" | "error", message: string) =>
    globalActions?.["Fragment.showToast"]?.(type, message, "top-center");

  const [form, setForm] = React.useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = React.useState(false);
  const [lastResult, setLastResult] = React.useState<string>("");

  const patch = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(current => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.text.trim()) {
      toast("error", "عنوان و متن اعلان را وارد کنید.");
      return;
    }
    if (
      (form.audience === "users" || form.audience === "panel_users") &&
      !form.userIds.trim()
    ) {
      toast(
        "error",
        form.audience === "panel_users"
          ? "شناسه کاربران پنل هدف را وارد کنید."
          : "شناسه کاربران هدف را وارد کنید."
      );
      return;
    }

    const isPanel =
      form.audience === "panel" || form.audience === "panel_users";
    if (isPanel && !form.isSaveData) {
      toast("error", "برای مخاطبان پنل، ذخیره در صندوق اعلان الزامی است.");
      return;
    }

    const ids = parseIds(form.userIds);
    const title = form.title.trim();
    const text = form.text.trim();
    const action = form.action.trim() || "/";
    const notification_type =
      form.audience === "all" || form.audience === "panel"
        ? "system"
        : form.notification_type;

    const upstreamBody: Record<string, unknown> = {
      title,
      text,
      action,
      notification_type,
      isSendNow: true,
      isSaveData: form.isSaveData,
      sentAt: new Date().toISOString(),
      audience: form.audience
    };

    if (form.audience === "all") {
      upstreamBody.topic = "all";
      upstreamBody.userIds = [0];
    } else if (form.audience === "users") {
      upstreamBody.userIds = ids;
    } else if (form.audience === "panel") {
      upstreamBody.userIds = [0];
      upstreamBody.panelUserIds = [0];
    } else {
      upstreamBody.userIds = ids;
      upstreamBody.panelUserIds = ids;
    }

    setSaving(true);
    setLastResult("");
    try {
      const { ok, data } = await sendNotification(
        token,
        upstreamBody,
        form.audience
      );
      if (!ok || data?.success === false) {
        toast("error", data?.message || "ارسال اعلان ناموفق بود.");
        setLastResult(data?.message || "خطا");
        return;
      }
      const savedToInbox =
        data?.result?.savedToInbox ?? form.isSaveData ?? false;
      toast(
        "success",
        savedToInbox
          ? "اعلان ارسال و در صندوق ذخیره شد."
          : "اعلان ارسال شد."
      );
      setLastResult(
        JSON.stringify(
          {
            audience: form.audience,
            topic: form.audience === "all" ? "all" : undefined,
            userIds: form.audience === "users" ? ids : undefined,
            panelUserIds:
              form.audience === "panel_users" ? ids : undefined,
            savedToInbox,
            webhook: isPanel
              ? PANEL_ROUTES.sendNotifPanel
              : PANEL_ROUTES.sendNotif,
            upstream: data?.result ?? data ?? null
          },
          null,
          2
        )
      );
      setForm(current => ({
        ...EMPTY_FORM,
        audience: current.audience,
        notification_type: current.notification_type,
        isSaveData: current.isSaveData
      }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      <div className={styles.header}>
        <div className={styles.title}>ارسال اعلان</div>
      </div>

      <div className={styles.body}>
        <div className={[styles.panel, localStyles.panelPad].join(" ")}>
          <form className={styles.modalForm} onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <label>
                <span className={styles.fieldLabel}>عنوان</span>
                <input
                  className={styles.input}
                  value={form.title}
                  maxLength={120}
                  required
                  placeholder="عنوان اعلان"
                  onChange={event => patch("title", event.target.value)}
                />
              </label>

              <label>
                <span className={styles.fieldLabel}>متن</span>
                <textarea
                  className={styles.input}
                  value={form.text}
                  rows={4}
                  maxLength={1000}
                  required
                  placeholder="متن پیام برای کاربر"
                  onChange={event => patch("text", event.target.value)}
                />
              </label>

              <label>
                <span className={styles.fieldLabel}>مسیر / اکشن (اختیاری)</span>
                <input
                  className={styles.input}
                  value={form.action}
                  dir="ltr"
                  maxLength={200}
                  placeholder="/home یا /notif"
                  onChange={event => patch("action", event.target.value)}
                />
              </label>

              <label>
                <span className={styles.fieldLabel}>نوع اعلان</span>
                <select
                  className={styles.input}
                  value={form.notification_type}
                  onChange={event =>
                    patch("notification_type", event.target.value)
                  }
                >
                  {NOTIF_TYPES.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className={localStyles.fieldset}>
                <legend className={styles.fieldLabel}>مخاطبان</legend>
                <label className={localStyles.radioRow}>
                  <input
                    type="radio"
                    name="audience"
                    checked={form.audience === "all"}
                    onChange={() => patch("audience", "all")}
                  />
                  <span>همه کاربران اپ (topic: all)</span>
                </label>
                <label className={localStyles.radioRow}>
                  <input
                    type="radio"
                    name="audience"
                    checked={form.audience === "users"}
                    onChange={() => patch("audience", "users")}
                  />
                  <span>کاربران اپ مشخص (شناسه)</span>
                </label>
                <label className={localStyles.radioRow}>
                  <input
                    type="radio"
                    name="audience"
                    checked={form.audience === "panel"}
                    onChange={() => patch("audience", "panel")}
                  />
                  <span>همه کارکنان پنل (صندوق اعلان پنل)</span>
                </label>
                <label className={localStyles.radioRow}>
                  <input
                    type="radio"
                    name="audience"
                    checked={form.audience === "panel_users"}
                    onChange={() => patch("audience", "panel_users")}
                  />
                  <span>کارکنان پنل مشخص (شناسه panel__users)</span>
                </label>
                {form.audience === "users" ||
                form.audience === "panel_users" ? (
                  <textarea
                    className={styles.input}
                    value={form.userIds}
                    rows={3}
                    dir="ltr"
                    placeholder={
                      form.audience === "panel_users"
                        ? "مثال: 2, 3, 115"
                        : "مثال: 27, 30, 44"
                    }
                    onChange={event => patch("userIds", event.target.value)}
                  />
                ) : null}
              </fieldset>

              <label className={styles.switchRow}>
                <span className={styles.fieldLabel}>
                  {form.audience === "panel" || form.audience === "panel_users"
                    ? "ذخیره در صندوق اعلان پنل"
                    : "ذخیره در صندوق اعلان کاربر"}
                </span>
                <input
                  type="checkbox"
                  checked={form.isSaveData}
                  onChange={event => patch("isSaveData", event.target.checked)}
                />
              </label>
            </div>

            <div className={styles.modalActions}>
              <Button
                color="success"
                loading={saving}
                disabel={saving}
                label="ارسال اعلان"
                submitsForm={true}
              />
              <Button
                color="muted"
                disabel={saving}
                label="پاک کردن فرم"
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setLastResult("");
                }}
              />
            </div>
          </form>

          {/* {lastResult ? (
            <pre className={localStyles.resultBox} dir="ltr">
              {lastResult}
            </pre>
          ) : null} */}
        </div>
      </div>
    </div>
  );
}

export default MainPageSendNotif;
