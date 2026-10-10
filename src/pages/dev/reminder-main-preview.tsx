/**
 * Local preview: main Reminder page (MainLiad shell embeds ReminderSetting).
 * Route: /dev/reminder-main-preview
 *
 * This is the `/reminder` path surface — not ReminderSetting alone.
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
    patientName: "همراه تست یادآوری"
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
      <Reminder data={MOCK_DATA} category={MOCK_CATEGORY} manId="63" />
    </div>
  );
}
