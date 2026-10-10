import * as React from "react";
import { useRouter } from "next/router";
import { ApiRequest } from "@/fragment/components/api-request";
import { PUBLIC_ROUTES } from "@/lib/apiRoutes";
import {
  PUBLIC_AUTH_COOKIE_NAME,
  resolvePublicAuthToken
} from "@/lib/publicAuthToken";
import { readCookie } from "@/lib/authCookies";
import { toPersianDigits } from "@/lib/datetime";
import { goBackOrReplace } from "../navigation/backNavigation";
import { buildCenterRoute } from "../centerNavigation";
import {
  rememberCompanionReturn,
  clearCompanionReturn
} from "../companion/companionFlow";
import Header from "../Header";
import StarFilledIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__StarFilled";
import MapPinIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__MapPin";
import styles from "./VisitBookingPage.module.css";
import { VisitBookingForm } from "./VisitBookingForm";

type VisitBookingPageProps = {
  centerId: string;
};

function formatRating(value: unknown): string | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return toPersianDigits(n.toFixed(1));
}

export function normalizeVisitCenterResponse(
  value: unknown
): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  const root = value as Record<string, unknown>;
  const candidates = [root.result, root.data, root.center, root];
  for (const candidate of candidates) {
    const item = Array.isArray(candidate) ? candidate[0] : candidate;
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      if (record.id != null || String(record.name || "").trim()) return record;
    }
  }
  return null;
}

function centerImage(center: Record<string, unknown> | null): string {
  const direct = String(center?.main_image || center?.logo || "").trim();
  if (direct) return direct;
  const images = center?.image;
  if (Array.isArray(images)) {
    const first = images[0] as Record<string, unknown> | string | undefined;
    return typeof first === "string"
      ? first
      : String(first?.image_url || first?.url || "").trim();
  }
  return typeof images === "string" ? images.trim() : "";
}

export function VisitBookingPage({ centerId }: VisitBookingPageProps) {
  const router = useRouter();
  const [center, setCenter] = React.useState<Record<string, unknown> | null>(
    null
  );
  const [centerLoading, setCenterLoading] = React.useState(true);

  const pageBase =
    typeof router.query.page === "string" && router.query.page
      ? router.query.page
      : "home";

  const authToken = React.useMemo(
    () => resolvePublicAuthToken(readCookie(PUBLIC_AUTH_COOKIE_NAME) || null),
    []
  );

  React.useEffect(() => {
    // Returning from addPatient lands here; clear the companion marker.
    clearCompanionReturn();
  }, []);

  const goBack = React.useCallback(() => {
    const fallback = buildCenterRoute(pageBase, centerId) || `/${pageBase}`;
    goBackOrReplace(router, fallback);
  }, [centerId, pageBase, router]);

  const startAddCompanion = React.useCallback(() => {
    rememberCompanionReturn({
      path: router.asPath,
      host: "visitBooking"
    });
    void router.push(`/${pageBase}/addPatient`);
  }, [pageBase, router]);

  const name = String(center?.name || "").trim() || "مرکز";
  const address = [center?.area, center?.address, center?.city]
    .map(v => String(v || "").trim())
    .filter(Boolean)
    .slice(0, 2)
    .join("، ");
  const rating = formatRating(center?.rating_avg ?? center?.rating);
  const image = centerImage(center) || "/plasmic/sayban/images/image30.svg";

  return (
    <div className={styles.page} data-visit-booking-page dir="rtl">
      <Header
        className={styles.header}
        slot="رزرو وقت بازدید"
        search={false}
        runCode
        back={goBack}
      />

      <div className={styles.scroll}>
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
          fresh
          loadingDisplay={<div className={`${styles.summary} ${styles.summaryShimmer}`} aria-label="در حال بارگذاری اطلاعات مرکز" />}
          errorDisplay={null}
          onLoading={loading => setCenterLoading(Boolean(loading))}
          onError={() => setCenterLoading(false)}
          onSuccess={(data: unknown) => {
            setCenter(normalizeVisitCenterResponse(data));
            setCenterLoading(false);
          }}
        >
          {centerLoading ? (
            <div className={`${styles.summary} ${styles.summaryShimmer}`} aria-label="در حال بارگذاری اطلاعات مرکز" />
          ) : center ? <div className={styles.summary}>
            <img className={styles.summaryMedia} src={image} alt="" />
            <div className={styles.summaryBody}>
              <div className={styles.summaryTop}>
                <h2 className={styles.summaryName}>{name}</h2>
                {rating ? (
                  <span className={styles.rating}>
                    <StarFilledIcon className={styles.ratingStar} />
                    {rating}
                  </span>
                ) : null}
              </div>
              {address ? (
                <div className={styles.summaryAddress}>
                  <MapPinIcon className={styles.addressPin} aria-hidden />
                  <span>{address}</span>
                </div>
              ) : null}
            </div>
          </div> : null}
        </ApiRequest>

        <VisitBookingForm
          centerId={centerId}
          token={authToken || undefined}
          onAddCompanion={startAddCompanion}
          onSuccess={goBack}
        />
      </div>
    </div>
  );
}

export default VisitBookingPage;
