import * as React from "react";
import Head from "next/head";
import CenterRegistrationReview from "../../../components/centerPanel/CenterRegistrationReview";
import type { CenterRegistrationDossier } from "../../../components/centerPanel/centerApproval";
import MainPageTags from "../../../components/MainPageTags";
import CenterInfo from "../../../components/CenterInfo";

const PREVIEW_DOSSIER: CenterRegistrationDossier = {
  id: 162,
  name: "مرکز نمونه سایبان",
  phone: "02191000000",
  email: "center@example.com",
  address: "تهران، خیابان نمونه، پلاک ۱۲",
  city: "تهران",
  state: "تهران",
  care_domain: "elderly",
  care_domain_fa: "سالمندان",
  manager_last_name: "رضایی",
  registered_center_name: "مرکز نمونه سایبان",
  establishment_notice: "",
  license_number: "",
  registration_docs: "",
  main_image: "",
  banner_image: "",
  images: [],
  approval_status: "pending",
  is_active: 0,
  account_id: 1,
  account_is_active: 0,
  account_email: "admin@example.com"
};

const PREVIEW_TAGS = [
  { id: 1, name: "کمردرد", slug: "back-pain", description: null },
  { id: 2, name: "فیزیوتراپی", slug: "physio", description: null },
  { id: 3, name: "سالمندان", slug: "elderly", description: null },
  { id: 4, name: "توانبخشی", slug: "rehab", description: null },
  { id: 5, name: "مراقبت در منزل", slug: "home-care", description: null }
];

/**
 * Local-only UI preview (no panel auth). Open:
 *   /dev/panel-ui-preview?view=tags
 *   /dev/panel-ui-preview?view=center-fields
 */
export default function PanelUiPreviewPage() {
  const [view, setView] = React.useState<"tags" | "review" | "center-fields">(
    "tags"
  );

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search).get("view");
    if (q === "review" || q === "tags" || q === "center-fields") setView(q);
    document.documentElement.dataset.saybanShell = "wide";
    return () => {
      document.documentElement.dataset.saybanShell = "app";
    };
  }, []);

  return (
    <>
      <Head>
        <title>پیش‌نمایش UI پنل</title>
      </Head>
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          direction: "rtl"
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            padding: "0.5rem 0.75rem",
            borderBottom: "1px solid #e6e8e3",
            flexShrink: 0
          }}
        >
          <button type="button" onClick={() => setView("tags")}>
            تگ‌ها
          </button>
          <button type="button" onClick={() => setView("review")}>
            مشاهده اطلاعات
          </button>
          <button type="button" onClick={() => setView("center-fields")}>
            نوع مرکز
          </button>
          <span
            style={{ marginInlineStart: "auto", opacity: 0.6, fontSize: 12 }}
          >
            /dev/panel-ui-preview
          </span>
        </div>
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          {view === "tags" ? (
            <MainPageTags previewItems={PREVIEW_TAGS} />
          ) : view === "center-fields" ? (
            <div style={{ display: "grid", gap: "1.5rem", padding: "1rem" }}>
              <section data-preview="create-center">
                <h2>ایجاد مرکز</h2>
                <CenterInfo
                  careDomain="پرستاری"
                  centerType="روزانه"
                  onCareDomainChange={() => undefined}
                  onCenterTypeChange={() => undefined}
                />
              </section>
              <section data-preview="center-info-modal">
                <h2>اطلاعات مرکز</h2>
                <CenterInfo hideTypeFields title="مرکز نمونه" />
              </section>
            </div>
          ) : (
            <CenterRegistrationReview
              centerId={162}
              previewDossier={PREVIEW_DOSSIER}
            />
          )}
        </div>
      </div>
    </>
  );
}
