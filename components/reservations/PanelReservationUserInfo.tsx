import * as React from "react";
import {
  formatReservationBirthDate,
  formatReservationGender,
  resolveReservationDisplayPerson
} from "./reservationDisplayPerson";
import {
  canRevealReservationIdentity,
  isNurseSelectionReservation,
  panelViewerFromToken
} from "./sanitizePanelReservation";
import { PANEL_AUTH_COOKIE_NAME, readCookie } from "@/lib/authCookies";
import ShowOnMapButton from "./ShowOnMapButton";
import styles from "./PanelReservationUserInfo.module.css";

type Props = {
  reservation: unknown;
};

export default function PanelReservationUserInfo({ reservation }: Props) {
  const person = React.useMemo(
    () => resolveReservationDisplayPerson(reservation),
    [reservation]
  );
  const identityHidden = React.useMemo(() => {
    const item =
      reservation && typeof reservation === "object" && !Array.isArray(reservation)
        ? (reservation as Record<string, unknown>)
        : null;
    if (!item || !isNurseSelectionReservation(item)) return false;
    return !canRevealReservationIdentity(
      item,
      panelViewerFromToken(readCookie(PANEL_AUTH_COOKIE_NAME))
    );
  }, [reservation]);

  if (!person) {
    return (
      <div className={styles.empty}>اطلاعات تکمیلی کاربر ثبت نشده است.</div>
    );
  }

  const fields = [
    {
      label: "شماره تماس",
      value: identityHidden ? undefined : person.mobile || person.phone
    },
    { label: "جنسیت", value: formatReservationGender(person.gender) },
    {
      label: "کد ملی",
      value: identityHidden
        ? undefined
        : person.national_code || person.national_id
    },
    {
      label: "تاریخ تولد",
      value: formatReservationBirthDate(person.birth_date)
    },
    { label: "آدرس", value: person.address, wide: true }
  ].filter(field => Boolean(String(field.value || "").trim()));

  const mapLocation = {
    latitude: person.latitude,
    longitude: person.longitude,
    query: person.address
  };

  const displayName = identityHidden ? null : person.name;

  return (
    <section className={styles.card} aria-label="اطلاعات کامل کاربر">
      <div className={styles.heading}>
        <span className={styles.title}>نام و نام خانوادگی</span>
        <strong className={styles.name}>{displayName || "—"}</strong>
        {!identityHidden && person.isCompanion && person.relation_persian ? (
          <span className={styles.relation}>
            همراه کاربر · {person.relation_persian}
          </span>
        ) : null}
      </div>

      {fields.length ? (
        <dl className={styles.grid}>
          {fields.map(field => (
            <div
              className={field.wide ? styles.fieldWide : styles.field}
              key={field.label}
            >
              <dt>{field.label}</dt>
              <dd dir={field.label === "شماره تماس" ? "ltr" : undefined}>
                <span className={styles.valueBlock}>
                  <span>{field.value}</span>
                  {field.label === "آدرس" ? (
                    <ShowOnMapButton location={mapLocation} />
                  ) : null}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className={styles.empty}>اطلاعات تکمیلی دیگری ثبت نشده است.</div>
      )}
    </section>
  );
}
