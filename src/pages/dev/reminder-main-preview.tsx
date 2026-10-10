/**
 * Local preview: main Reminder page with Homepage-like Menu2 footer chrome.
 * Route: /dev/reminder-main-preview
 *
 * Simulates the deployed `/reminder` shell (phone column + bottom menu) so
 * detail/lightbox stacking can be verified without the full Homepage auth wall.
 */
import * as React from "react";
import dynamic from "next/dynamic";

const Reminder = dynamic(() => import("../../../components/Reminder"), {
  ssr: false
});

const MOCK_CATEGORY = {
  type: [
    {
      category_name: "medicine_time",
      category_name_fa: "دارو",
      icon: "medicine_time",
      items: [
        {
          type: "medicine_time",
          type_fa: "مصرف دارو",
          name: "مصرف دارو",
          name_fa: "مصرف دارو",
          title_fa: "مصرف دارو",
          icon: "medicine_time",
          is_addable: 1
        }
      ]
    }
  ],
  category: [
    {
      name: "medicine_time",
      name_fa: "دارو",
      icon: "medicine_time",
      is_addable: 1
    }
  ]
};

const MOCK_DATA = [
  {
    id: 9001,
    name: "قرص فشار خون",
    type: "medicine_time",
    schedule_type: "everyDay",
    status: "active",
    active: 1,
    times: '["09:30"]',
    weekdays:
      '["saturday","sunday","monday","tuesday","wednesday","thursday","friday"]',
    dates: "[]",
    channels: '["notification"]',
    patient_id: 34,
    patientId: 34,
    patient_name: "همراه تست یادآوری",
    patientName: "همراه تست یادآوری",
    image_url:
      "https://teh-3.s3.poshtiban.com/lioms3/2026-06/panel/liad/2026-06-06-b48be7d5-b980-46c1-8232-72fa509d5524.png",
    imageUrl:
      "https://teh-3.s3.poshtiban.com/lioms3/2026-06/panel/liad/2026-06-06-b48be7d5-b980-46c1-8232-72fa509d5524.png"
  },
  {
    id: 9002,
    name: "بدون تصویر",
    type: "medicine_time",
    schedule_type: "everyDay",
    status: "active",
    active: 1,
    times: '["10:00"]',
    weekdays:
      '["saturday","sunday","monday","tuesday","wednesday","thursday","friday"]',
    dates: "[]",
    channels: '["notification"]'
  },
  {
    id: 9003,
    name: "سالگرد ازدواج",
    type: "occasion",
    schedule_type: "everyYear",
    status: "active",
    active: 1,
    times: '["09:30"]',
    weekdays: "[]",
    dates: '["2026-10-09"]',
    channels: '["notification"]'
  }
];

export default function ReminderMainPreviewPage() {
  React.useEffect(() => {
    const root = document.documentElement;
    const prev = root.getAttribute("data-sayban-shell");
    root.setAttribute("data-sayban-shell", "app");
    return () => {
      if (prev == null) root.removeAttribute("data-sayban-shell");
      else root.setAttribute("data-sayban-shell", prev);
    };
  }, []);

  React.useEffect(() => {
    const sync = () => {
      document.documentElement.toggleAttribute(
        "data-reminder-detail-open",
        Boolean(document.querySelector("[data-reminder-detail]"))
      );
    };
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      document.documentElement.removeAttribute("data-reminder-detail-open");
    };
  }, []);

  return (
    <div
      data-sayban-shell-preview="1"
      style={{
        maxWidth: "var(--sayban-app-max, 500px)",
        width: "100%",
        margin: "0 auto",
        height: "100dvh",
        background: "var(--token-KPGXdu9o7llP, #f5f2ea)",
        position: "relative",
        overflow: "hidden"
      }}
    >
      <div
        style={{
          height: "100%",
          paddingBottom: "6.5rem",
          boxSizing: "border-box",
          overflow: "auto"
        }}
      >
        <Reminder data={MOCK_DATA} category={MOCK_CATEGORY} manId="63" />
      </div>
      {/* Mirrors Homepage Menu2; hidden while detail page is open (ReservationDetails pattern). */}
      <div
        data-preview-app-footer="1"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 40,
          width: "100%",
          maxWidth: "var(--sayban-app-max, 500px)",
          marginInline: "auto",
          height: "calc(5.8rem + env(safe-area-inset-bottom, 0px))",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          pointerEvents: "none",
          background:
            "linear-gradient(to top, rgba(245,242,234,0.98), rgba(245,242,234,0.85) 55%, transparent)"
        }}
      >
        <div
          style={{
            width: "calc(100% - 1.5rem)",
            height: "4.25rem",
            marginBottom: "0.75rem",
            borderRadius: "1.25rem",
            background: "#fff",
            boxShadow: "0 10px 28px rgba(175,164,145,0.24)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "#5a5a5a",
            pointerEvents: "auto"
          }}
        >
          <span>یادآوری</span>
          <span>خانه</span>
          <span>کاربر</span>
        </div>
      </div>
      <style jsx global>{`
        html[data-reminder-detail-open] [data-preview-app-footer] {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
