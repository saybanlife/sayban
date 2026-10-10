import * as React from "react";
import Head from "next/head";
import { DateTimePicker } from "@/components/DateTimePicker";
import Dialog from "../../../components/Dialog";

/**
 * Local preview for public date/time dialog layout on desktop shell.
 * Visit: /dev/datetime-preview/
 */
export default function DatetimePreviewPage() {
  const [openDate, setOpenDate] = React.useState(false);
  const [openTime, setOpenTime] = React.useState(false);
  const [date, setDate] = React.useState("2026-09-20");
  const [time, setTime] = React.useState("14:30");

  React.useLayoutEffect(() => {
    document.documentElement.setAttribute("data-sayban-shell", "app");
    setOpenDate(true);
    return () => {
      document.documentElement.removeAttribute("data-sayban-shell");
    };
  }, []);

  return (
    <>
      <Head>
        <title>DateTime preview</title>
      </Head>
      <main
        style={{
          minHeight: "100dvh",
          padding: "1.5rem",
          direction: "rtl",
          background: "#f5f2ea"
        }}
      >
        <h1 style={{ fontSize: "1.1rem" }}>پیش‌نمایش انتخاب تاریخ/ساعت</h1>
        <p>
          تاریخ: {date} — ساعت: {time}
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={() => setOpenDate(true)}>
            باز کردن تاریخ
          </button>
          <button type="button" onClick={() => setOpenTime(true)}>
            باز کردن ساعت
          </button>
        </div>

        <Dialog
          opendialog={openDate}
          onOpendialogChange={v => setOpenDate(Boolean(v))}
          disableModalHash
        >
          <div style={{ width: "100%", padding: "0.5rem 0 1rem" }}>
            <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>
              انتخاب تاریخ
            </h2>
            <DateTimePicker
              mode="date"
              date={date}
              onDateChange={setDate}
              disablePastDates
            />
            <button
              type="button"
              style={{ marginTop: 12, width: "100%", height: 44 }}
              onClick={() => setOpenDate(false)}
            >
              تایید
            </button>
          </div>
        </Dialog>

        <Dialog
          opendialog={openTime}
          onOpendialogChange={v => setOpenTime(Boolean(v))}
          disableModalHash
        >
          <div style={{ width: "100%", padding: "0.5rem 0 1rem" }}>
            <h2 style={{ margin: "0 0 0.75rem", fontSize: "1rem" }}>
              انتخاب ساعت
            </h2>
            <DateTimePicker mode="time" time={time} onTimeChange={setTime} />
            <button
              type="button"
              style={{ marginTop: 12, width: "100%", height: 44 }}
              onClick={() => setOpenTime(false)}
            >
              تایید
            </button>
          </div>
        </Dialog>
      </main>
    </>
  );
}
