import * as React from "react";
import { useRouter } from "next/router";
import { ApiRequest } from "@/fragment/components/api-request";
import { PUBLIC_ROUTES } from "@/lib/apiRoutes";
import {
  resolvePublicAuthToken,
  PUBLIC_AUTH_COOKIE_NAME
} from "@/lib/publicAuthToken";
import { readCookie } from "../support/supportTypes";
import { goBackOrReplace } from "../navigation/backNavigation";
import { buildCenterRoute, buildStaffRoute } from "../centerNavigation";
import {
  formatStaffExperience,
  formatStaffRating,
  normalizeCenterStaff,
  type CenterStaffCard
} from "./centerStaffModel";
import StarFilledIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__StarFilled";
import ChevronLeftIcon from "../plasmic/sayban/icons/PlasmicIcon__ChevronLeft";
import styles from "./CenterStaffSection.module.css";

type CenterStaffListPageProps = {
  centerId: string;
};

function formatRating(value: number): string {
  return formatStaffRating(value);
}

function formatExperience(years: number): string {
  return formatStaffExperience(years);
}

export function CenterStaffListPage({ centerId }: CenterStaffListPageProps) {
  const router = useRouter();
  const [items, setItems] = React.useState<CenterStaffCard[]>([]);
  const [centerName, setCenterName] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const pageBase =
    typeof router.query.page === "string" && router.query.page
      ? router.query.page
      : "home";

  const authToken = React.useMemo(
    () =>
      resolvePublicAuthToken(readCookie(PUBLIC_AUTH_COOKIE_NAME) || null),
    []
  );

  const goBack = React.useCallback(() => {
    const fallback = buildCenterRoute(pageBase, centerId) || `/${pageBase}`;
    goBackOrReplace(router, fallback);
  }, [centerId, pageBase, router]);

  const goToStaff = React.useCallback(
    async (staffId: number) => {
      const route = buildStaffRoute(pageBase, staffId);
      if (route) await router.push(route);
    },
    [pageBase, router]
  );

  return (
    <div className={styles.listPage}>
      <ApiRequest
        method="GET"
        url={PUBLIC_ROUTES.centerPublic}
        params={{ id: centerId }}
        config={
          authToken
            ? { headers: { Authorization: `Bearer ${authToken}` } }
            : undefined
        }
        shouldFetch={Boolean(centerId)}
        loadingDisplay={null}
        errorDisplay={null}
        onLoading={(isLoading: boolean) => setLoading(Boolean(isLoading))}
        onSuccess={(data: unknown) => {
          const root =
            data && typeof data === "object"
              ? (data as Record<string, unknown>)
              : {};
          const result =
            root.result && typeof root.result === "object"
              ? (root.result as Record<string, unknown>)
              : root;
          setCenterName(String(result.name || "").trim());
          setItems(normalizeCenterStaff(result.staff ?? result.staffs, 100));
          setError(false);
          setLoading(false);
        }}
        onError={() => {
          setItems([]);
          setError(true);
          setLoading(false);
        }}
      >
        {null}
      </ApiRequest>

      <header className={styles.listHeader}>
        <button
          type="button"
          className={styles.backButton}
          onClick={goBack}
          aria-label="بازگشت"
        >
          <ChevronLeftIcon role="img" />
        </button>
        <div>
          <h1 className={styles.listTitle}>پرستاران مرکز</h1>
          {centerName ? (
            <p className={styles.listSubtitle}>{centerName}</p>
          ) : null}
        </div>
      </header>

      {loading ? (
        <div className={styles.listGrid} aria-busy="true">
          {[0, 1, 2, 3, 4, 5].map(key => (
            <div key={key} className={`${styles.card} ${styles.cardSkeleton}`} />
          ))}
        </div>
      ) : error ? (
        <div className={styles.empty}>بارگذاری پرستاران ناموفق بود.</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          هنوز پرستاری برای این مرکز ثبت نشده است.
        </div>
      ) : (
        <div className={styles.listGrid}>
          {items.map(item => (
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
                    {formatRating(item.rating)}
                  </span>
                </div>
                <h3 className={styles.name}>{item.name}</h3>
                <div className={styles.meta}>
                  <span className={styles.metaText}>
                    {formatExperience(item.experience_years)}
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
    </div>
  );
}

export default CenterStaffListPage;
