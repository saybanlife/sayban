/**
 * Local UX walkthrough for nurse request + reservation details.
 * Route: /dev/booking-ux-preview
 * Bypasses Homepage auth so header/layout/flow can be inspected.
 */
import * as React from "react";
import dynamic from "next/dynamic";
import type { ReservationRecord } from "../../../components/reservation/reservationDetailsModel";
import HomeStatusCard from "../../../components/home/HomeStatusCard";
import { selectLatestHomeReservations } from "../../../components/home/homeReservationStatus";

const NurseRequestFlow = dynamic(
  () => import("../../../components/nurseRequest/NurseRequestFlow"),
  { ssr: false }
);
const ReservationStateDetails = dynamic(
  () => import("../../../components/ReservationStateDetails"),
  { ssr: false }
);

type PreviewTab =
  | "homeStatus"
  | "nurseRequest"
  | "nurseWaiting"
  | "nurseOffers"
  | "nurseInterview"
  | "trialPay"
  | "trialAttend"
  | "contract"
  | "visit"
  | "service";

const TABS: Array<{ id: PreviewTab; label: string }> = [
  { id: "homeStatus", label: "Home وضعیت" },
  { id: "nurseRequest", label: "درخواست مراقب" },
  { id: "nurseWaiting", label: "جزئیات: انتظار پیشنهاد" },
  { id: "nurseOffers", label: "جزئیات: پیشنهادها" },
  { id: "nurseInterview", label: "جزئیات: انتخاب مصاحبه" },
  { id: "trialPay", label: "جزئیات: پرداخت آزمایشی" },
  { id: "trialAttend", label: "جزئیات: حضور آزمایشی" },
  { id: "contract", label: "جزئیات: قرارداد" },
  { id: "visit", label: "جزئیات: بازدید" },
  { id: "service", label: "جزئیات: خدمت یک‌باره" }
];

/** Live-shaped active visits (service_name, no service_code) like /Reservation. */
const REAL_HOME_STATUS_PAYLOAD = {
  result: [
    {
      id: 364,
      created_at: "2026-10-06T12:25:46Z",
      status: "pending",
      service_id: 126,
      service_name: "رزرو وقت مشاوره و بازدید",
      service_code: null,
      service_location: null,
      center_id: 109,
      center_name: "مرکز الف",
      center_phone: "02111111111",
      start_time: "2026-10-07T10:00:00+03:30"
    },
    {
      id: 363,
      created_at: "2026-10-03T12:48:07Z",
      status: "awaitingSupport",
      service_id: 126,
      service_name: "رزرو وقت مشاوره و بازدید",
      service_code: null,
      center_id: 165,
      center_name: "خانهٔ سالمندان نورسته",
      center_phone: "02122222222",
      start_time: "2026-10-04T09:00:00+03:30"
    }
  ]
};

const baseNurse: ReservationRecord = {
  id: 501,
  status: "awaitingOffers",
  service_location: "home",
  service_id: null,
  service_name: "مراقب مداوم",
  user: { name: "مادربزرگ فاطمه" },
  created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
  center_name: "تواناگستر",
  center_phone: "09106596000",
  center_city: "تهران",
  center_address: "سعادت‌آباد",
  staff_name: "مریم",
  staff_rating: 4.7
};

function mockFor(tab: PreviewTab): ReservationRecord | null {
  switch (tab) {
    case "nurseWaiting":
      return { ...baseNurse, status: "awaitingOffers" };
    case "nurseOffers":
      return { ...baseNurse, status: "offersReceived" };
    case "nurseInterview": {
      const day = (offset: number, hour: number) => {
        const date = new Date();
        date.setDate(date.getDate() + offset);
        date.setHours(hour, 0, 0, 0);
        const pad = (n: number) => String(n).padStart(2, "0");
        const start = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hour)}:00:00`;
        const endDate = new Date(date);
        endDate.setMinutes(30);
        const end = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00`;
        return {
          starts_at: start,
          ends_at: end,
          modes: ["online", "home", "center"] as Array<
            "online" | "home" | "center"
          >
        };
      };
      return {
        ...baseNurse,
        status: "nurseSelected",
        lifecycle_stage: "awaiting_interview",
        interview_options: [day(1, 10), day(2, 16), day(3, 11)]
      };
    }
    case "trialPay":
      return {
        ...baseNurse,
        status: "paymentCompleted",
        lifecycle_stage: "trial_payment",
        interview_at: new Date(Date.now() - 86400_000).toISOString(),
        trial_start_at: new Date(Date.now() + 2 * 86400_000).toISOString(),
        trial_end_at: new Date(Date.now() + 4 * 86400_000).toISOString(),
        trial_total_price: 2800000
      };
    case "trialAttend":
      return {
        ...baseNurse,
        status: "paymentCompleted",
        lifecycle_stage: "trial_in_progress",
        interview_at: new Date(Date.now() - 3 * 86400_000).toISOString(),
        trial_start_at: new Date().toISOString(),
        trial_end_at: new Date(Date.now() + 86400_000).toISOString(),
        trial_attendance_user: 1
      };
    case "contract":
      return {
        ...baseNurse,
        status: "paymentCompleted",
        lifecycle_stage: "awaiting_contract",
        contract_deadline: new Date(Date.now() + 2 * 86400_000).toISOString(),
        center_latitude: 35.78,
        center_longitude: 51.37
      };
    case "visit":
      return {
        id: 502,
        status: "pending",
        // Match live /Reservation rows: name present, code often absent
        service_code: undefined,
        service_name: "رزرو وقت مشاوره و بازدید",
        service_id: 126,
        service_location: undefined,
        center_name: "خانه سالمندان نورسته",
        center_phone: "02100000000",
        start_time: new Date(Date.now() + 86400_000).toISOString(),
        user: { name: "نورسته" }
      };
    case "service":
      return {
        id: 503,
        status: "confirmed",
        payment_status: "paid",
        service_id: 95,
        service_name: "تزریق",
        service_location: "home",
        staff_name: "سمیه",
        staff_rating: 4.2,
        center_name: "تواناگستر",
        start_time: new Date(Date.now() + 86400_000).toISOString(),
        final_price: 450000,
        user: { name: "مادربزرگ فاطمه" },
        cancellation_policy: {
          full_refund_before_hours: 12,
          partial_refund_before_hours: 4,
          partial_refund_percent: 50
        }
      };
    default:
      return null;
  }
}

const shell: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f7f4ea",
  fontFamily: "Vazirmatn, Tahoma, sans-serif"
};

const phone: React.CSSProperties = {
  width: 390,
  minHeight: 780,
  margin: "16px auto",
  background: "#fff",
  borderRadius: 24,
  overflow: "auto",
  boxShadow: "0 12px 40px rgb(0 0 0 / 12%)",
  position: "relative"
};

const tabsBar: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  padding: 12,
  direction: "rtl",
  justifyContent: "center"
};

export default function BookingUxPreviewPage() {
  const [tab, setTab] = React.useState<PreviewTab>("homeStatus");
  const reservation = mockFor(tab);
  const homeStatusItems = React.useMemo(
    () => selectLatestHomeReservations(REAL_HOME_STATUS_PAYLOAD),
    []
  );

  return (
    <main style={shell} dir="rtl">
      <div style={tabsBar}>
        {TABS.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border:
                tab === item.id ? "2px solid #6f8a3a" : "1px solid #d8d4c4",
              background: tab === item.id ? "#eef4df" : "#fff",
              font: "inherit",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div style={phone}>
        {tab === "homeStatus" ? (
          <section style={{ padding: 16 }} aria-label="وضعیت">
            <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 800 }}>
              وضعیت
            </h2>
            <div style={{ display: "grid", gap: 12 }}>
              {homeStatusItems.map(item => (
                <HomeStatusCard
                  key={String(item.id)}
                  reservation={item}
                  onOpenDetails={() =>
                    alert(`جزئیات رزرو ${String(item.id)}`)
                  }
                />
              ))}
            </div>
          </section>
        ) : tab === "nurseRequest" ? (
          <NurseRequestFlow
            profile={{ name: "خانم رضایی", first_name: "رضایی" }}
            userNew={() => alert("افزودن همراه → /home/addPatient")}
          />
        ) : reservation ? (
          <ReservationStateDetails
            reservation={reservation}
            onPay={() => alert("پرداخت")}
            onChange={() => undefined}
          />
        ) : null}
      </div>
    </main>
  );
}
