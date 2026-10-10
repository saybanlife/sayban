import * as React from "react";
import { useRouter } from "next/router";
import { classNames } from "@plasmicapp/react-web";
import {
  PlasmicReservationDetails,
  DefaultReservationDetailsProps
} from "./plasmic/sayban/PlasmicReservationDetails";
import sty from "./plasmic/sayban/PlasmicReservationDetails.module.css";
import detailStyles from "./ReservationDetails.module.css";
import Status from "./Status";
import UploudeTime from "./UploudeTime";
import Button from "./Button";
import { resolveApiUrl, PUBLIC_ROUTES } from "../src/lib/apiRoutes";
import { goBackOrReplace } from "./navigation/backNavigation";
import {
  RESERVATION_CACHE_KEY,
  buildReservationSteps,
  isFreeReservation,
  isNurseReservation,
  isPaymentDone,
  reservationPaymentStatusLabel,
  reservationStatusHint,
  type ReservationRecord
} from "./reservation/reservationDetailsModel";
import UserIcon from "./plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__User";
import CalendarStatsIcon from "./plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__CalendarStats";
import CurrentLocationIcon from "./plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__CurrentLocation";
import BoxIcon from "./plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Box";
import UserShieldIcon from "./plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__UserShield";
import CreditCardPayIcon from "./plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__CreditCardPay";
import BellIcon from "./plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Bell";
import CalendarCheckIcon from "./plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__CalendarCheck";

export interface ReservationDetailsProps
  extends Omit<DefaultReservationDetailsProps, "api"> {
  reservationId: string;
  onBack?: () => void;
}

function readCookie(name: string) {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(
    new RegExp(
      `(?:^|; )${name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1")}=([^;]*)`
    )
  );
  return match ? decodeURIComponent(match[1]) : "";
}

function readCachedReservation(id: string): ReservationRecord | null {
  try {
    const raw = window.sessionStorage.getItem(RESERVATION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReservationRecord;
    if (String(parsed?.id) === String(id)) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function pickReservationPayload(data: any): ReservationRecord | null {
  if (!data) return null;
  if (Array.isArray(data)) return (data[0] as ReservationRecord) ?? null;
  if (Array.isArray(data.result)) {
    return (data.result[0] as ReservationRecord) ?? null;
  }
  if (data.result && typeof data.result === "object") {
    return data.result as ReservationRecord;
  }
  if (typeof data === "object" && (data.id || data.status)) {
    return data as ReservationRecord;
  }
  return null;
}

function findInList(data: any, id: string): ReservationRecord | null {
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.result)
      ? data.result
      : [];
  return (
    (list.find(
      (item: ReservationRecord) => String(item?.id) === String(id)
    ) as ReservationRecord | undefined) ?? null
  );
}

function buildPostTime(reservation: ReservationRecord | null) {
  if (!reservation) return null;
  const addTime = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return null;
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds()
    };
  };
  if (reservation.start_time) return addTime(String(reservation.start_time));
  try {
    if (!reservation.answers) return null;
    const answers = JSON.parse(String(reservation.answers));
    const dateObject = answers?.find((i: any) => i.type === "date");
    const timeObject = answers?.find((i: any) => i.type === "time");
    let dateValue = "";
    let timeValue = "";
    if (dateObject?.answer?.gregorian) {
      const g = dateObject.answer.gregorian;
      dateValue = `${g.year}-${String(g.month).padStart(2, "0")}-${String(g.day).padStart(2, "0")}`;
    }
    if (
      timeObject?.answer?.hour !== undefined &&
      timeObject?.answer?.minute !== undefined
    ) {
      timeValue = `${String(timeObject.answer.hour).padStart(2, "0")}:${String(timeObject.answer.minute).padStart(2, "0")}`;
    }
    if (dateValue && timeValue) return addTime(`${dateValue}T${timeValue}:00`);
  } catch {
    return null;
  }
  return null;
}

function ReservationStepIcon({
  stepKey
}: {
  stepKey: ReturnType<typeof buildReservationSteps>[number]["key"];
}) {
  const iconProps = {
    className: detailStyles.stepIcon,
    "aria-hidden": true
  };
  if (stepKey === "payment") return <CreditCardPayIcon {...iconProps} />;
  if (stepKey === "centerConfirm") return <CalendarCheckIcon {...iconProps} />;
  if (stepKey === "nurseOffer") return <UserShieldIcon {...iconProps} />;
  return <BoxIcon {...iconProps} />;
}

function ReservationDetailsBody({
  reservation,
  loading,
  error,
  onPay,
  onOffers
}: {
  reservation: ReservationRecord | null;
  loading: boolean;
  error: string | null;
  onPay: () => void;
  onOffers: () => void;
}) {
  const nurse = isNurseReservation(reservation);
  const steps = buildReservationSteps(reservation);
  const posttime = React.useMemo(
    () => buildPostTime(reservation),
    [reservation]
  );
  const status = String(reservation?.status ?? "pending");
  const free = isFreeReservation(reservation);
  const paymentComplete = isPaymentDone(reservation);
  const paymentLabel = reservationPaymentStatusLabel(reservation);
  const showPay =
    !free &&
    (status === "awaitingPayment" ||
      (status === "offersReceived" && nurse && !paymentComplete));
  const showOffers = status === "offersReceived" && nurse;
  const addressText = reservation
    ? `${reservation.user_addressTitle ? `${reservation.user_addressTitle} - ` : ""}${reservation.user_addressCity || ""} ${reservation.user_address || ""}`.trim()
    : "";

  if (loading && !reservation) {
    return (
      <div className={classNames("all", sty.freeBox__qIduB)}>
        <div className={classNames("all", sty.freeBox__egf40, "shimmer")} />
        <div className={classNames("all", sty.freeBox__mhFwg, "shimmer")} />
        <div className={classNames("all", sty.freeBox__viKyl, "shimmer")} />
      </div>
    );
  }

  if (error && !reservation) {
    return (
      <div className={classNames("all", sty.freeBox__t5Rev)}>
        <div className={classNames("all", "__wab_text", sty.text___49O1F)}>
          {error}
        </div>
      </div>
    );
  }

  const svgClass = classNames("all", sty.svg__d4ETz);

  return (
    <div className={classNames("all", detailStyles.detailsBody)}>
      <div className={classNames("all", detailStyles.summaryCard)}>
        <div className={classNames("all", detailStyles.summaryTop)}>
          <div className={classNames("all", detailStyles.summaryMain)}>
            <div className={classNames("all", "__wab_text", detailStyles.summaryTitle)}>
              جزئیات رزرو
            </div>
            {reservation?.reservation_code ? (
              <div className={classNames("all", "__wab_text", detailStyles.summaryCode)}>
                کد: {reservation.reservation_code}
              </div>
            ) : null}
          </div>
          <Status status={status as any} />
        </div>

        <div className={classNames("all", detailStyles.badgeRow)}>
          <span
            className={
              paymentComplete
                ? detailStyles.badgePaid
                : detailStyles.badgeUnpaid
            }
          >
            {paymentLabel}
          </span>
        </div>

        <div
          className={classNames("all", detailStyles.timeline)}
          role="list"
          aria-label="مراحل وضعیت رزرو"
        >
          {steps.map((step, index) => (
            <React.Fragment key={step.key}>
              {index > 0 ? (
                <div
                  className={classNames(
                    "all",
                    detailStyles.stepLine,
                    steps[index - 1]?.done && step.done
                      ? detailStyles.stepLineDone
                      : undefined
                  )}
                />
              ) : null}
              <div
                className={classNames(
                  "all",
                  detailStyles.step,
                  step.done ? detailStyles.stepDone : undefined,
                  step.current ? detailStyles.stepCurrent : undefined
                )}
                role="listitem"
                aria-current={step.current ? "step" : undefined}
              >
                <div className={classNames("all", detailStyles.stepDot)}>
                  <ReservationStepIcon stepKey={step.key} />
                </div>
                <div className={classNames("all", detailStyles.stepLabel)}>
                  {step.label}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div
        className={classNames(
          "all",
          sty.freeBox__mMtpm,
          detailStyles.infoCard,
          detailStyles.statusCard
        )}
      >
        <div className={classNames("all", sty.freeBox__zelEs, detailStyles.iconBox)}>
          <BoxIcon className={svgClass} role="img" />
        </div>
        <div className={classNames("all", sty.freeBox__wDFdQ, detailStyles.textGroup)}>
          <div className={classNames("all", "__wab_text", sty.text__q7FPj, detailStyles.infoTitle)}>
            وضعیت درخواست
          </div>
          <div className={classNames("all", "__wab_text", sty.text__udEzn, detailStyles.infoValue)}>
            {reservationStatusHint(status)}
          </div>
        </div>
      </div>

      {reservation?.user?.name ? (
        <div className={classNames("all", sty.freeBox__mMtpm, detailStyles.infoCard)}>
          <div className={classNames("all", sty.freeBox__zelEs, detailStyles.iconBox)}>
            <UserIcon className={svgClass} role="img" />
          </div>
          <div className={classNames("all", sty.freeBox__wDFdQ, detailStyles.textGroup)}>
            <div className={classNames("all", "__wab_text", sty.text__q7FPj, detailStyles.infoTitle)}>
              کاربر
            </div>
            <div className={classNames("all", "__wab_text", sty.text__udEzn, detailStyles.infoValue)}>
              {reservation.user.name}
            </div>
          </div>
        </div>
      ) : null}

      <div className={classNames("all", sty.freeBox__szFAr, detailStyles.infoCard)}>
        <div className={classNames("all", sty.freeBox__aDyCk, detailStyles.iconBox)}>
          <CalendarStatsIcon className={classNames("all", sty.svg__tylV)} role="img" />
        </div>
        <div className={classNames("all", sty.freeBox__gzlzj, detailStyles.textGroup)}>
          <div className={classNames("all", "__wab_text", sty.text__rejb1, detailStyles.infoTitle)}>
            تاریخ و ساعت
          </div>
          {posttime ? (
            <UploudeTime posttime={posttime as any} />
          ) : (
            <div className={classNames("all", "__wab_text", sty.text__udEzn, detailStyles.infoValue)}>
              زمان ثبت نشده است
            </div>
          )}
        </div>
      </div>

      {!nurse ? (
        <div className={classNames("all", sty.freeBox__oSmTy, detailStyles.infoCard)}>
          <div className={classNames("all", sty.freeBox__uJiIm, detailStyles.iconBox)}>
            <CurrentLocationIcon
              className={classNames("all", sty.svg__jVHhV)}
              role="img"
            />
          </div>
          <div className={classNames("all", sty.freeBox__n5WMi, detailStyles.textGroup)}>
            <div className={classNames("all", "__wab_text", sty.text__qigzY, detailStyles.infoTitle)}>
              مکان
            </div>
            <div className={classNames("all", "__wab_text", sty.text___8Df7U, detailStyles.infoValue)}>
              {reservation?.center_name || "—"}
            </div>
          </div>
        </div>
      ) : null}

      <div className={classNames("all", sty.freeBox__oufWi, detailStyles.infoCard)}>
        <div className={classNames("all", sty.freeBox__xxy3R, detailStyles.iconBox)}>
          <BoxIcon className={classNames("all", sty.svg__d59J1)} role="img" />
        </div>
        <div className={classNames("all", sty.freeBox__gMkeU, detailStyles.textGroup)}>
          <div className={classNames("all", "__wab_text", sty.text__lf0Q7, detailStyles.infoTitle)}>
            خدمت
          </div>
          <div className={classNames("all", "__wab_text", sty.text__ikunt, detailStyles.infoValue)}>
            {nurse ? "درخواست پرستار" : reservation?.service_name || "—"}
          </div>
        </div>
      </div>

      {nurse ? (
        <div className={classNames("all", sty.freeBox__mMtpm, detailStyles.infoCard)}>
          <div className={classNames("all", sty.freeBox__zelEs, detailStyles.iconBox)}>
            <UserShieldIcon className={svgClass} role="img" />
          </div>
          <div className={classNames("all", sty.freeBox__wDFdQ, detailStyles.textGroup)}>
            <div className={classNames("all", "__wab_text", sty.text__q7FPj, detailStyles.infoTitle)}>
              پرستار
            </div>
            <div className={classNames("all", "__wab_text", sty.text__udEzn, detailStyles.infoValue)}>
              {reservation?.staff?.name || "پرستاری انتخاب نشده است"}
            </div>
          </div>
        </div>
      ) : null}

      {nurse ? (
        <div className={classNames("all", sty.freeBox__oSmTy, detailStyles.infoCard)}>
          <div className={classNames("all", sty.freeBox__uJiIm, detailStyles.iconBox)}>
            <CurrentLocationIcon
              className={classNames("all", sty.svg__jVHhV)}
              role="img"
            />
          </div>
          <div className={classNames("all", sty.freeBox__n5WMi, detailStyles.textGroup)}>
            <div className={classNames("all", "__wab_text", sty.text__qigzY, detailStyles.infoTitle)}>
              آدرس
            </div>
            <div className={classNames("all", "__wab_text", sty.text___8Df7U, detailStyles.infoValue)}>
              {addressText || "آدرسی ثبت نشده است"}
            </div>
          </div>
        </div>
      ) : null}

      <div className={classNames("all", sty.freeBox__oufWi, detailStyles.infoCard)}>
        <div className={classNames("all", sty.freeBox__xxy3R, detailStyles.iconBox)}>
          <CreditCardPayIcon
            className={classNames("all", sty.svg__d59J1)}
            role="img"
          />
        </div>
        <div className={classNames("all", sty.freeBox__gMkeU, detailStyles.textGroup)}>
          <div className={classNames("all", "__wab_text", sty.text__lf0Q7, detailStyles.infoTitle)}>
            وضعیت پرداخت
          </div>
          <div className={classNames("all", "__wab_text", sty.text__ikunt, detailStyles.infoValue)}>
            <span
              className={
                paymentComplete
                  ? detailStyles.badgePaid
                  : detailStyles.badgeUnpaid
              }
            >
              {paymentLabel}
            </span>
          </div>
        </div>
      </div>

      {!paymentComplete ? (
        <aside className={detailStyles.notice} aria-label="توجه">
          <div className={detailStyles.noticeIcon}>
            <BellIcon aria-hidden="true" />
          </div>
          <div>
            <div className={detailStyles.noticeTitle}>توجه</div>
            <div className={detailStyles.noticeText}>
              پس از تأیید مرکز، برای ادامه رزرو و پرداخت اقدام کنید.
            </div>
          </div>
        </aside>
      ) : null}

      {(showPay || showOffers) && (
        <div className={classNames("all", detailStyles.detailsActions)}>
          {showOffers ? (
            <Button
              className={detailStyles.detailsCta}
              color="success"
              label="انتخاب پرستار"
              onClick={onOffers}
            />
          ) : null}
          {showPay ? (
            <Button
              className={detailStyles.detailsCta}
              color="success"
              label="پرداخت"
              onClick={onPay}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function ReservationDetails({
  reservationId,
  token: tokenProp,
  onBack,
  ...rest
}: ReservationDetailsProps) {
  const router = useRouter();
  const [reservation, setReservation] = React.useState<ReservationRecord | null>(
    null
  );
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const token = tokenProp || readCookie("token");

  const basePath =
    typeof router.query.page === "string" && router.query.page
      ? router.query.page
      : "home";

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const cached = readCachedReservation(reservationId);
      if (cached && !cancelled) setReservation(cached);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      };

      try {
        const paymentRes = await fetch(
          resolveApiUrl(
            `/reservations/payment?id=${encodeURIComponent(reservationId)}`
          ),
          { method: "GET", headers, cache: "no-store" }
        );
        if (paymentRes.ok) {
          const paymentData = await paymentRes.json().catch(() => null);
          const fromPayment = pickReservationPayload(paymentData);
          if (fromPayment && !cancelled) {
            const merged = { ...(cached ?? {}), ...fromPayment };
            setReservation(merged);
            try {
              window.sessionStorage.setItem(
                RESERVATION_CACHE_KEY,
                JSON.stringify(merged)
              );
            } catch {
              /* ignore quota */
            }
            setLoading(false);
            return;
          }
        }

        const listRes = await fetch(resolveApiUrl(PUBLIC_ROUTES.reservation), {
          method: "GET",
          headers,
          cache: "no-store"
        });
        if (listRes.ok) {
          const listData = await listRes.json().catch(() => null);
          const found = findInList(listData, reservationId);
          if (found && !cancelled) {
            const merged = { ...(cached ?? {}), ...found };
            setReservation(merged);
            try {
              window.sessionStorage.setItem(
                RESERVATION_CACHE_KEY,
                JSON.stringify(merged)
              );
            } catch {
              /* ignore quota */
            }
            setLoading(false);
            return;
          }
        }

        if (!cached && !cancelled) setError("جزئیات این رزرو پیدا نشد.");
      } catch {
        if (!cached && !cancelled) setError("خطا در دریافت جزئیات رزرو.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [reservationId, token]);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    goBackOrReplace(router, `/${basePath}/booking`);
  };

  const handlePay = () => {
    if (!reservation?.id) return;
    window.sessionStorage.setItem("payId", String(reservation.id));
    router.push(`/${basePath}/pay_${reservation.id}`);
  };

  const handleOffers = () => {
    if (!reservation?.id) return;
    window.sessionStorage.setItem("id", String(reservation.id));
    router.push(`/${basePath}/offer_${reservation.id}`);
  };

  return (
    <PlasmicReservationDetails
      {...rest}
      token={token}
      api={false}
      overrides={{
        reservation: {
          render: () => (
            <ReservationDetailsBody
              reservation={reservation}
              loading={loading}
              error={error}
              onPay={handlePay}
              onOffers={handleOffers}
            />
          )
        },
        header: {
          props: {
            search: false,
            runCode: true,
            back: handleBack,
            slot: (
              <div className={classNames("all", "__wab_text", sty.text___26COw)}>
                جزئیات رزرو
              </div>
            ),
            slot2: null
          }
        },
        bookingHeader: {
          render: () => null
        },
        filterIcon2: {
          render: () => null
        },
        dialog: {
          props: {
            opendialog: false
          }
        },
        filter2: {
          props: {
            opendialog: false
          }
        }
      }}
    />
  );
}

export default ReservationDetails;
