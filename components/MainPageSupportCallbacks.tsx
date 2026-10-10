import * as React from "react";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import Button from "./Button";
import EmptyPage from "./EmptyPage";
import styles from "./MainPageSupport.module.css";
import callbackStyles from "./MainPageSupportCallbacks.module.css";
import { panelListSupportCallbacks } from "./support/supportApi";
import {
  formatPhoneDisplay,
  normalizeSupportCallbackRows,
  type SupportCallbackRequest
} from "./support/supportCallbackModel";
import { formatSupportDateTime } from "./support/supportTypes";

type MainPageSupportCallbacksProps = {
  token?: string;
  className?: string;
};

export function MainPageSupportCallbacks({
  token,
  className
}: MainPageSupportCallbacksProps) {
  const globalActions = useGlobalActions();
  const toast = (type: "success" | "error", message: string) =>
    globalActions?.["Fragment.showToast"]?.(type, message, "top-center");

  const [items, setItems] = React.useState<SupportCallbackRequest[]>([]);
  const [loading, setLoading] = React.useState(false);

  const loadItems = React.useCallback(async () => {
    setLoading(true);
    try {
      const { ok, data } = await panelListSupportCallbacks(token);
      if (!ok || data?.success === false) {
        toast("error", data?.message || "بارگذاری درخواست‌های تماس ناموفق بود.");
        return;
      }
      setItems(normalizeSupportCallbackRows(data?.result));
    } catch {
      toast("error", "بارگذاری درخواست‌های تماس ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    void loadItems();
  }, [loadItems]);

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")} dir="rtl">
      <div className={styles.header}>
        <div className={styles.title}>درخواست تماس پشتیبانی</div>
        <div className={styles.headerActions}>
          <Button
            color="second"
            loading={loading}
            disabel={loading}
            label={<span className={styles.buttonLabel}>بروزرسانی</span>}
            onClick={() => void loadItems()}
          />
        </div>
      </div>

      <div className={styles.body}>
        {loading && !items.length ? (
          <div className={styles.loadingState}>در حال بارگذاری...</div>
        ) : !items.length ? (
          <EmptyPage className={styles.emptyPage} />
        ) : (
          <div className={callbackStyles.table}>
            <div className={callbackStyles.head}>
              <span>کاربر</span>
              <span>شماره تماس</span>
              <span>تاریخ و ساعت درخواست</span>
            </div>
            <ul className={callbackStyles.rows}>
              {items.map(item => (
                <li key={item.id} className={callbackStyles.row}>
                  <div className={callbackStyles.user}>
                    <strong>
                      {item.user_name?.trim() || `کاربر ${item.user_id}`}
                    </strong>
                    <span>شناسه: {item.user_id}</span>
                  </div>
                  <div className={callbackStyles.phone} dir="ltr">
                    {formatPhoneDisplay(item.phone)}
                  </div>
                  <div className={callbackStyles.date}>
                    {formatSupportDateTime(item.created_at) || "—"}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default MainPageSupportCallbacks;
