/**
 * Local preview: ReminderSetting with companion+image mock data.
 * Route: /dev/reminder-companion-preview
 */
import * as React from "react";
import dynamic from "next/dynamic";

const ReminderSetting = dynamic(
  () => import("../../../components/ReminderSetting"),
  { ssr: false }
);

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
    name: "بدون همراه",
    type: "medicine_time",
    schedule_type: "everyDay",
    status: "active",
    active: 1,
    times: '["10:00"]',
    weekdays:
      '["saturday","sunday","monday","tuesday","wednesday","thursday","friday"]',
    dates: "[]",
    channels: '["notification"]'
  }
];

export default function ReminderCompanionPreviewPage() {
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
      <ReminderSetting
        data={MOCK_DATA}
        category={MOCK_CATEGORY}
        manId="63"
        token="dev-preview"
      />
    </div>
  );
}
