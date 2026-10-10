import * as React from "react";
import Head from "next/head";
import Modal from "../../../components/Modal";
import PanelOptionSelect from "../../../components/centerPanel/PanelOptionSelect";
import TimeField from "../../../components/datetime/PanelTimePicker";
import {
  CARE_DOMAIN_FA_OPTIONS,
  CENTER_TYPE_FA_OPTIONS
} from "../../../components/centerPage/centerEnumLocales";
import {
  factsFromCenterResult,
  overviewFactsPayload
} from "../../../components/centerPanel/centerFactsSchema";
import CoverageAreasField from "../../../components/centerPanel/CoverageAreasField";
import type { DispatchTehranDistrictOption } from "../../../components/centerPanel/centerFactsSchema";

const STORAGE_KEY = "sayban-dev-response-hours";

type SavedHours = {
  response_hours_start: string;
  response_hours_end: string;
  dispatch_tehran_districts?: string | null;
};

/**
 * Local preview of the center-facts modal selects + response-hours pickers.
 * Visit: /dev/center-modal-preview/
 *
 * Mirrors panel OverviewFactsEditor: TimeField is `inline` inside Modal.
 * Save / reload simulates overviewFactsPayload → factsFromCenterResult roundtrip.
 */
export default function CenterModalPreviewPage() {
  const [centerType, setCenterType] = React.useState("");
  const [careDomain, setCareDomain] = React.useState("پرستاری");
  const [responseStart, setResponseStart] = React.useState("");
  const [responseEnd, setResponseEnd] = React.useState("");
  const [coverage, setCoverage] = React.useState<
    DispatchTehranDistrictOption[]
  >([]);
  const [formKey, setFormKey] = React.useState(0);
  const [saveStatus, setSaveStatus] = React.useState("");

  React.useLayoutEffect(() => {
    document.documentElement.setAttribute("data-sayban-shell", "wide");
    return () => {
      document.documentElement.removeAttribute("data-sayban-shell");
    };
  }, []);

  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as SavedHours;
      if (parsed.response_hours_start) {
        setResponseStart(parsed.response_hours_start);
      }
      if (parsed.response_hours_end) {
        setResponseEnd(parsed.response_hours_end);
      }
      if (parsed.dispatch_tehran_districts) {
        const loaded = factsFromCenterResult({
          care_domain: "nursing",
          dispatch_tehran_districts: parsed.dispatch_tehran_districts
        });
        setCoverage([...loaded.overview.dispatch_tehran_districts]);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleSave = () => {
    try {
      // Same shape panel sends for nursing overview hours.
      const payload = overviewFactsPayload({
        center_type: centerType || "شبانه‌روزی",
        care_domain: careDomain || "پرستاری",
        admission_gender: "فقط خانم‌ها",
        total_capacity: "",
        founded_year: "1400",
        care_staff_count: "5",
        active_staff_count: "3",
        min_work_experience_value: "1",
        min_work_experience_unit: "سال",
        dispatch_tehran_districts: coverage,
        dispatch_lead_time: "کمتر از ۲ ساعت",
        urgent_dispatch: "بله، شبانه‌روزی",
        activity_days: ["شنبه"],
        response_hours_start: responseStart || "08:00",
        response_hours_end: responseEnd || "20:00"
      });
      const reloaded = factsFromCenterResult({
        center_type: payload.center_type,
        care_domain: payload.care_domain,
        admission_gender: payload.admission_gender,
        founded_year: payload.founded_year,
        care_staff_count: payload.care_staff_count,
        active_staff_count: payload.active_staff_count,
        min_work_experience_value: payload.min_work_experience_value,
        min_work_experience_unit: payload.min_work_experience_unit,
        dispatch_tehran_districts: payload.dispatch_tehran_districts,
        dispatch_lead_time: payload.dispatch_lead_time,
        urgent_dispatch: payload.urgent_dispatch,
        activity_days: payload.activity_days,
        response_hours_start: payload.response_hours_start,
        response_hours_end: payload.response_hours_end
      });
      const saved: SavedHours = {
        response_hours_start: reloaded.overview.response_hours_start,
        response_hours_end: reloaded.overview.response_hours_end,
        dispatch_tehran_districts: payload.dispatch_tehran_districts
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      setResponseStart(saved.response_hours_start);
      setResponseEnd(saved.response_hours_end);
      setCoverage([...reloaded.overview.dispatch_tehran_districts]);
      setFormKey(k => k + 1);
      setSaveStatus(
        `saved:${saved.response_hours_start}|${saved.response_hours_end}|${String(
          saved.dispatch_tehran_districts || ""
        )}`
      );
    } catch (error) {
      setSaveStatus(
        `save-error:${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const handleReload = () => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setSaveStatus("reload:empty");
      return;
    }
    const parsed = JSON.parse(raw) as SavedHours;
    setResponseStart(parsed.response_hours_start || "");
    setResponseEnd(parsed.response_hours_end || "");
    if (parsed.dispatch_tehran_districts) {
      const loaded = factsFromCenterResult({
        care_domain: "nursing",
        dispatch_tehran_districts: parsed.dispatch_tehran_districts
      });
      setCoverage([...loaded.overview.dispatch_tehran_districts]);
    }
    setFormKey(k => k + 1);
    setSaveStatus(
      `reloaded:${parsed.response_hours_start}|${parsed.response_hours_end}`
    );
  };

  return (
    <>
      <Head>
        <title>Center modal preview</title>
      </Head>
      <main style={{ minHeight: "140vh", padding: "1rem" }}>
        <p data-preview-center-type={centerType}>زمان فعالیت: {centerType || "—"}</p>
        <p data-preview-care-domain={careDomain}>نوع مراقبت: {careDomain || "—"}</p>
        <p data-preview-response-start={responseStart}>
          ساعت شروع: {responseStart || "—"}
        </p>
        <p data-preview-response-end={responseEnd}>
          ساعت پایان: {responseEnd || "—"}
        </p>
        <p data-preview-coverage={coverage.join("،")}>
          مناطق: {coverage.join("، ") || "—"}
        </p>
        <p data-preview-save-status={saveStatus}>{saveStatus || "—"}</p>
      </main>
      <Modal
        isOpen={true}
        noTrigger={true}
        showHeader={true}
        showFooter={false}
        heading="ویرایش اطلاعات کلی"
        onOpenChange={() => undefined}
        content={
          <form
            key={formKey}
            data-preview-form="center-facts"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              direction: "rtl",
              padding: "0 0 1rem"
            }}
            onSubmit={event => event.preventDefault()}
          >
            <label>
              <span>زمان فعالیت مرکز</span>
              <PanelOptionSelect
                label="زمان فعالیت مرکز"
                value={centerType}
                options={CENTER_TYPE_FA_OPTIONS}
                onChange={setCenterType}
              />
            </label>
            <label>
              <span>نوع مراقبت</span>
              <PanelOptionSelect
                label="نوع مراقبت"
                value={careDomain}
                options={CARE_DOMAIN_FA_OPTIONS}
                onChange={setCareDomain}
              />
            </label>
            <div>
              <span>مناطق تحت پوشش</span>
              <CoverageAreasField
                label="مناطق تحت پوشش"
                value={coverage}
                onChange={setCoverage}
              />
            </div>
            <div>
              <span>ساعات پاسخ‌گویی چیست؟</span>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr",
                  gap: "0.75rem",
                  marginTop: "0.5rem"
                }}
              >
                <TimeField
                  id="preview-response-start"
                  label="ساعت شروع"
                  inline
                  value={responseStart}
                  onChange={setResponseStart}
                />
                <TimeField
                  id="preview-response-end"
                  label="ساعت پایان"
                  inline
                  value={responseEnd}
                  onChange={setResponseEnd}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" data-preview-save onClick={handleSave}>
                ذخیره
              </button>
              <button type="button" data-preview-reload onClick={handleReload}>
                بازخوانی مجدد
              </button>
            </div>
            {Array.from({ length: 8 }, (_, i) => (
              <p key={i} style={{ margin: 0 }}>
                ردیف اضافی {i + 1} برای سنجش اسکرول داخل مودال.
              </p>
            ))}
          </form>
        }
      />
    </>
  );
}
