export type ReservationPanelStatusOption = {
  value: string;
  label: string;
};

export type ReservationPanelStatusGroup = {
  group: string;
  items: ReservationPanelStatusOption[];
};

/**
 * Statuses the center panel can set manually in «تغییر وضعیت رزرو».
 * Automated pipeline steps (payment, nurse matching, etc.) are excluded from
 * the dialog but remain valid in DB, filters, and Status display.
 */
export const RESERVATION_PANEL_STATUS_GROUPS: ReservationPanelStatusGroup[] = [
  {
    group: "بررسی و تصمیم",
    items: [
      { value: "pending", label: "در انتظار تأیید" },
      { value: "confirmed", label: "تأیید شده" },
      { value: "rejected", label: "رد شده" },
      { value: "canceled", label: "لغو شده" },
      { value: "userNoResponse", label: "کاربر پاسخ نداد" }
    ]
  },
  {
    group: "اجرای خدمت",
    items: [
      { value: "inProgress", label: "خدمت در حال انجام" },
      { value: "completed", label: "تکمیل شده" }
    ]
  },
  {
    group: "استثناها",
    items: [
      { value: "refunded", label: "بازپرداخت شده" },
      { value: "awaitingSupport", label: "نیازمند رسیدگی پشتیبانی" }
    ]
  }
];
