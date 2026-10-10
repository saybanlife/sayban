import * as React from "react";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import { jalaaliMonthLength, toGregorian, toJalaali } from "jalaali-js";
import { ApiRequest } from "@/fragment/components/api-request";
import { PUBLIC_ROUTES } from "@/lib/apiRoutes";
import Button from "../Button";
import Calendar from "../Calendar";
import SelectTime from "../SelectTime";
import Topics from "../Topics";
import {
  type BookingSlot,
  type BookingSlotGroup,
  buildHolidayQueryParams,
  buildReservationPayload,
  buildSlotRangeQueryParams,
  buildSlotQueryParams,
  canConfirmBooking,
  findFirstAvailableBookingDay,
  findFirstAvailableBookingSlot,
  isValidBookingSlot,
  visitService
} from "../reservation/visitBooking";
import { isHolidayDate } from "../reservation/bookingCalendar";
import CalendarCancelIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__CalendarCancel";
import styles from "./VisitBookingPage.module.css";

type Patient = {
  id: number | string;
  name?: string;
  relation_persian?: string;
};

type VisitBookingFormProps = {
  centerId: string;
  token?: string;
  onAddCompanion: () => void;
  onSuccess: () => void;
};

const PERIODS = [
  { label: "صبح", value: "morning" },
  { label: "ظهر", value: "noon" },
  { label: "عصر و شب", value: "evening_night" }
];

function currentJalaliMonth() {
  const now = new Date();
  const { jy, jm } = toJalaali(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate()
  );
  return { year: jy, month: jm };
}

function monthAtOffset(offset: 0 | 1) {
  const current = currentJalaliMonth();
  const zeroBased = current.month - 1 + offset;
  return {
    year: current.year + Math.floor(zeroBased / 12),
    month: (zeroBased % 12) + 1
  };
}

function monthDays(year: number, month: number) {
  const today = new Date();
  const current = toJalaali(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );
  const firstDay = year === current.jy && month === current.jm ? current.jd : 1;
  return Array.from(
    { length: jalaaliMonthLength(year, month) - firstDay + 1 },
    (_, index) => {
      const jd = firstDay + index;
      const { gy, gm, gd } = toGregorian(year, month, jd);
      const date = new Date(gy, gm - 1, gd);
      return {
        gy,
        gm,
        gd,
        jy: year,
        jm: month,
        jd,
        month: date.toLocaleString("fa-IR", { month: "long" }),
        week: date.toLocaleString("fa-IR", { weekday: "long" }),
        formatted: `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`
      };
    }
  );
}

function responsePatients(value: unknown): Patient[] {
  const payload = value as { data?: unknown } | null;
  if (!Array.isArray(payload?.data)) return [];
  return (payload.data as Patient[]).filter(patient => {
    const hasId = patient?.id !== undefined && patient?.id !== null;
    const hasName = typeof patient?.name === "string" && patient.name.trim() !== "";
    return hasId && hasName;
  });
}

function DatePickerShimmer() {
  return (
    <section className={`${styles.pickerSection} ${styles.dateShimmer}`} aria-label="در حال بارگذاری تاریخ‌ها">
      <div className={styles.shimmerBanner} />
      <div className={styles.shimmerMonth} />
      <div className={styles.shimmerDays}>
        {Array.from({ length: 6 }, (_, index) => <span key={index} />)}
      </div>
    </section>
  );
}

function TimePickerShimmer() {
  return (
    <div className={styles.timeShimmer} aria-label="در حال دریافت ساعت‌ها">
      {Array.from({ length: 9 }, (_, index) => <span key={index} />)}
    </div>
  );
}

function CompanionShimmer() {
  return (
    <section className={`${styles.companionSection} ${styles.companionShimmer}`} aria-label="در حال بارگذاری همراهان">
      <span className={styles.shimmerTitle} />
      <span className={styles.shimmerCompanionRow} />
      <span className={styles.shimmerCompanionButton} />
    </section>
  );
}

export function VisitBookingForm({
  centerId,
  token,
  onAddCompanion,
  onSuccess
}: VisitBookingFormProps) {
  const globalActions = useGlobalActions();
  const service = React.useMemo(() => visitService(), []);
  const [monthOffset, setMonthOffset] = React.useState<0 | 1>(0);
  const jalaliMonth = React.useMemo(() => monthAtOffset(monthOffset), [monthOffset]);
  const [holidays, setHolidays] = React.useState<unknown[]>([]);
  const [dateLoading, setDateLoading] = React.useState(true);
  const [selectedDate, setSelectedDate] = React.useState<string>();
  const [period, setPeriod] = React.useState("morning");
  const [slots, setSlots] = React.useState<BookingSlotGroup[]>([]);
  const [slotsLoading, setSlotsLoading] = React.useState(true);
  // SelectTime's generated renderer reads `selected.slot_start` directly.
  // An empty object keeps every option unselected; null makes its fallback
  // return the `select` variant for every row.
  const [selectedSlot, setSelectedSlot] = React.useState<BookingSlot>({});
  const [patients, setPatients] = React.useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = React.useState(true);
  const [selectedPatientId, setSelectedPatientId] = React.useState<string>("self");
  const [submitting, setSubmitting] = React.useState(false);
  const [searchingFirst, setSearchingFirst] = React.useState(false);
  const timeSectionRef = React.useRef<HTMLElement | null>(null);

  const days = React.useMemo(
    () => monthDays(jalaliMonth.year, jalaliMonth.month),
    [jalaliMonth]
  );
  const visibleSlots =
    slots.find(item => item.period === period)?.slots?.filter(Boolean) ?? [];
  const authConfig = token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : undefined;

  React.useEffect(() => {
    if (selectedDate && !isHolidayDate(holidays, selectedDate)) return;
    const firstAvailable = days.find(day => !isHolidayDate(holidays, day.formatted));
    setSelectedDate(firstAvailable?.formatted);
  }, [days, holidays, selectedDate]);

  const changeMonth = (nextOffset: 0 | 1) => {
    if (nextOffset === monthOffset) return;
    setMonthOffset(nextOffset);
    setSelectedDate(undefined);
    setSelectedSlot({});
    setDateLoading(true);
  };

  const selectFirstAvailable = async () => {
    const first = findFirstAvailableBookingSlot(slots);
    if (first) {
      setPeriod(first.period);
      setSelectedSlot(first.slot);
      window.requestAnimationFrame(() => {
        timeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    const request = globalActions?.["Fragment.apiRequest"] as
      | ((...args: unknown[]) => Promise<any>)
      | undefined;
    if (!request || searchingFirst) return;
    const currentDays = monthDays(monthAtOffset(0).year, monthAtOffset(0).month);
    const nextDays = monthDays(monthAtOffset(1).year, monthAtOffset(1).month);
    const candidates = [...currentDays, ...nextDays].filter(
      day => !selectedDate || day.formatted > selectedDate
    );
    const rangeParams = candidates.length
      ? buildSlotRangeQueryParams({
          centerId,
          service,
          dateFrom: candidates[0].formatted,
          dateTo: candidates[candidates.length - 1].formatted
        })
      : null;

    setSearchingFirst(true);
    try {
      if (rangeParams) {
        const response = await request(
          "GET",
          PUBLIC_ROUTES.serviceWorkingRange,
          rangeParams,
          undefined,
          authConfig
        );
        const found = findFirstAvailableBookingDay(response?.data?.result);
        if (found) {
          const targetDay = candidates.find(day => day.formatted === found.date);
          if (!targetDay) throw new Error("Availability date is outside the requested range");
          const nextMonth = monthAtOffset(1);
          const targetOffset: 0 | 1 =
            targetDay.jy === nextMonth.year && targetDay.jm === nextMonth.month ? 1 : 0;
          setMonthOffset(targetOffset);
          setSelectedDate(found.date);
          setSlots(found.groups);
          setPeriod(found.period);
          setSelectedSlot(found.slot);
          window.requestAnimationFrame(() => {
            timeSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
          });
          return;
        }
      }

      globalActions?.["Fragment.showToast"]?.(
        "error",
        "تا یک ماه آینده نوبت آزادی وجود ندارد.",
        "top-center",
        4000
      );
    } catch {
      globalActions?.["Fragment.showToast"]?.(
        "error",
        "دریافت نوبت‌های آزاد انجام نشد. لطفاً دوباره تلاش کنید.",
        "top-center",
        4000
      );
    } finally {
      setSearchingFirst(false);
    }
  };

  const submit = async () => {
    const payload = buildReservationPayload({
      centerId,
      service,
      date: selectedDate,
      slot: selectedSlot,
      patientId: selectedPatientId === "self" ? null : selectedPatientId
    });
    const request = globalActions?.["Fragment.apiRequest"] as
      | ((...args: unknown[]) => Promise<any>)
      | undefined;
    if (!payload || !request || submitting) return;

    setSubmitting(true);
    try {
      const response = await request("POST", "/reservations", undefined, payload, authConfig);
      const succeeded = Boolean(response?.data?.success);
      globalActions?.["Fragment.showToast"]?.(
        succeeded ? "success" : "error",
        succeeded
          ? "رزرو وقت بازدید شما با موفقیت ثبت شد. جزئیات را در بخش سوابق رزرو می‌بینید."
          : "ثبت رزرو انجام نشد. لطفاً دوباره تلاش کنید.",
        "top-center",
        succeeded ? 5000 : 4000
      );
      if (succeeded) {
        window.sessionStorage.setItem("payId", String(response?.data?.result ?? ""));
        onSuccess();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.bookingForm} data-visit-booking-form>
      <ApiRequest
        method="GET"
        url={PUBLIC_ROUTES.serviceHoliday}
        params={
          buildHolidayQueryParams({
            centerId,
            service,
            year: jalaliMonth.year,
            month: jalaliMonth.month
          }) ?? {}
        }
        config={authConfig}
        onLoading={loading => setDateLoading(Boolean(loading))}
        onSuccess={data => {
          setHolidays(Array.isArray(data?.result) ? data.result : []);
          setDateLoading(false);
        }}
        onError={() => setDateLoading(false)}
        loadingDisplay={<DatePickerShimmer />}
        errorDisplay={null}
      >
        {dateLoading ? <DatePickerShimmer /> : <section className={styles.pickerSection} aria-labelledby="visit-date-title">
          <div className={styles.instruction}>
            <strong id="visit-date-title">لطفاً روز مورد نظر خود را انتخاب کنید</strong>
            <span>سپس ساعت مناسب را مشخص کنید</span>
          </div>
          <div className={styles.monthRow}>
            <button
              type="button"
              className={styles.previousMonth}
              onClick={() => changeMonth(0)}
              disabled={monthOffset === 0}
            >
              <span aria-hidden>‹</span> ماه قبل
            </button>
            <strong>{days[0]?.month} {jalaliMonth.year.toLocaleString("fa-IR", { useGrouping: false })}</strong>
            <button
              type="button"
              className={styles.nextMonth}
              onClick={() => changeMonth(1)}
              disabled={monthOffset === 1}
            >
              ماه بعد <span aria-hidden>›</span>
            </button>
          </div>
          <Calendar
            className={styles.calendar}
            days={days}
            holidays={holidays}
            selected={selectedDate as never}
            onSelectedChange={value => {
              setSelectedDate(String(value));
              setSelectedSlot({});
              setSlotsLoading(true);
            }}
            clearTime={() => setSelectedSlot({})}
          />
        </section>}
      </ApiRequest>

      <section
        ref={timeSectionRef}
        className={`${styles.pickerSection} ${styles.timeSection}`}
        aria-label="انتخاب ساعت"
      >
        <Topics
          className={styles.periods}
          data={PERIODS}
          selected={period}
          onSelectedChange={value => {
            setPeriod(String(value));
            setSelectedSlot({});
          }}
          size="small"
        />
        <ApiRequest
          method="GET"
          url={PUBLIC_ROUTES.serviceWorking}
          params={buildSlotQueryParams({ centerId, service, date: selectedDate }) ?? {}}
          config={authConfig}
          shouldFetch={Boolean(buildSlotQueryParams({ centerId, service, date: selectedDate }))}
          onLoading={loading => setSlotsLoading(Boolean(loading))}
          onSuccess={data => {
            setSlots(Array.isArray(data?.result) ? data.result : []);
            setSlotsLoading(false);
          }}
          onError={() => setSlotsLoading(false)}
          loadingDisplay={<TimePickerShimmer />}
          errorDisplay={<p className={styles.empty}>دریافت ساعت‌های آزاد انجام نشد.</p>}
        >
          {slotsLoading ? <TimePickerShimmer /> : visibleSlots.some(isValidBookingSlot) ? (
            <div className={styles.timeViewport} data-time-slot-viewport>
              <SelectTime
                className={styles.times}
                times={visibleSlots}
                selected={selectedSlot as never}
                onSelectedChange={value => setSelectedSlot(value as unknown as BookingSlot)}
              />
            </div>
          ) : (
            <div className={styles.emptyTimeState}>
              <span className={styles.emptyTimeIcon} aria-hidden>
                <CalendarCancelIcon />
              </span>
              <p>نوبتی برای این تاریخ موجود نیست.</p>
              <button type="button" onClick={selectFirstAvailable} disabled={searchingFirst}>
                <span aria-hidden>‹</span>
                {searchingFirst ? "در حال جست‌وجو…" : "برو به اولین نوبت"}
              </button>
            </div>
          )}
        </ApiRequest>
      </section>

      <ApiRequest
        method="GET"
        url={PUBLIC_ROUTES.patients}
        params={{}}
        config={authConfig}
        onLoading={loading => setPatientsLoading(Boolean(loading))}
        onSuccess={data => {
          setPatients(responsePatients(data));
          setPatientsLoading(false);
        }}
        onError={() => setPatientsLoading(false)}
        loadingDisplay={<CompanionShimmer />}
        errorDisplay={null}
      >
        {patientsLoading ? <CompanionShimmer /> : <section className={styles.companionSection} aria-labelledby="visit-companion-title">
          <h2 id="visit-companion-title" className={styles.sectionTitle}>رزرو برای چه کسی؟</h2>
          <label className={styles.companionOption}>
            <input
              type="radio"
              name="visit-patient"
              value="self"
              checked={selectedPatientId === "self"}
              onChange={event => setSelectedPatientId(event.target.value)}
            />
            <span><strong>برای خودم</strong><small>رزرو برای حساب فعلی</small></span>
          </label>
          {patients.map(patient => (
            <label className={styles.companionOption} key={patient.id}>
              <input
                type="radio"
                name="visit-patient"
                value={String(patient.id)}
                checked={selectedPatientId === String(patient.id)}
                onChange={event => setSelectedPatientId(event.target.value)}
              />
              <span>
                <strong>{patient.name}</strong>
                {patient.relation_persian ? <small>{patient.relation_persian}</small> : null}
              </span>
            </label>
          ))}
          <button type="button" className={styles.addCompanion} onClick={onAddCompanion}>
            <span aria-hidden>＋</span> افزودن همراه جدید
          </button>
        </section>}
      </ApiRequest>

      <div className={styles.confirmBar}>
        <Button
          className={styles.confirmButton}
          color="success"
          size="extraLarge"
          label="تأیید و ادامه"
          loading={submitting}
          disabel={!canConfirmBooking(selectedDate, selectedSlot)}
          onClick={submit as never}
        />
      </div>
    </div>
  );
}

