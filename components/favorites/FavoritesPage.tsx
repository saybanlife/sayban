import * as React from "react";
import { useRouter } from "next/router";
import Header from "../Header";
import Item from "../Item";
import {
  FAVORITES_CHANGED,
  fetchFavoriteCenters,
  type FavoriteCenter
} from "./favoritesApi";
import styles from "./FavoritesPage.module.css";

export default function FavoritesPage() {
  const router = useRouter();
  const pageBase =
    typeof router.query.page === "string" && router.query.page
      ? router.query.page
      : "user";
  const [loading, setLoading] = React.useState(true);
  const [loggedIn, setLoggedIn] = React.useState(true);
  const [error, setError] = React.useState("");
  const [centers, setCenters] = React.useState<FavoriteCenter[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchFavoriteCenters();
      setLoggedIn(result.loggedIn);
      setCenters(result.centers);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "خطا در دریافت علاقه‌مندی‌ها"
      );
      setCenters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
    const onChange = () => void load();
    window.addEventListener(FAVORITES_CHANGED, onChange);
    return () => window.removeEventListener(FAVORITES_CHANGED, onChange);
  }, [load]);

  const openCenter = (center: FavoriteCenter) => {
    const id = String(center.id ?? "").trim();
    if (!id) return;
    try {
      window.sessionStorage.setItem("id", id);
    } catch {
      /* ignore */
    }
    void router.push(`/${pageBase}/center/${id}`);
  };

  return (
    <div className={styles.page} dir="rtl">
      <Header
        className={styles.header}
        slot="علاقه‌مندی‌ها"
        search={false}
        back={() => void router.push(`/${pageBase}`)}
      />
      <div className={styles.body}>
        {loading ? (
          <div className={styles.state} role="status" aria-live="polite">
            <span className={styles.spinner} aria-hidden />
            در حال بارگذاری…
          </div>
        ) : error ? (
          <div className={styles.state} role="alert">
            {error}
          </div>
        ) : !loggedIn ? (
          <div className={styles.empty}>
            <p>برای دیدن علاقه‌مندی‌ها ابتدا وارد حساب کاربری شوید.</p>
            <button
              type="button"
              className={styles.loginBtn}
              onClick={() => void router.push("/login/mobile")}
            >
              ورود
            </button>
          </div>
        ) : !centers.length ? (
          <div className={styles.empty}>
            <p>هنوز مرکزی به علاقه‌مندی‌ها اضافه نکرده‌اید.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {centers.map(center => (
              <div
                key={String(center.id)}
                className={styles.itemWrap}
                role="button"
                tabIndex={0}
                onClick={() => openCenter(center)}
                onKeyDown={event => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openCenter(center);
                  }
                }}
              >
                <Item item={center} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
