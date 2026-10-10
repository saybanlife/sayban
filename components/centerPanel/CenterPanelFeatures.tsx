import * as React from "react";
import CenterAmenitiesManager from "./CenterAmenitiesManager";
import CenterCareItemsManager from "./CenterCareItemsManager";
import CenterDailyLifeManager from "./CenterDailyLifeManager";
import CenterFaqManager from "./CenterFaqManager";
import CenterVisitPolicyManager from "./CenterVisitPolicyManager";
import styles from "./CenterPanelFeatures.module.css";

type CenterPanelFeaturesProps = {
  centerId?: string | number;
  token?: string;
};

type PanelTabId =
  | "care_treatment"
  | "daily_life"
  | "family_visit"
  | "amenities"
  | "faq";

const PANEL_TABS: { id: PanelTabId; label: string }[] = [
  { id: "care_treatment", label: "مراقبت و درمان" },
  { id: "daily_life", label: "زندگی روزمره" },
  { id: "family_visit", label: "ملاقات خانواده" },
  { id: "amenities", label: "امکانات" },
  { id: "faq", label: "سوالات متداول" }
];

export function CenterPanelFeatures({
  centerId,
  token
}: CenterPanelFeaturesProps) {
  const [activeTab, setActiveTab] = React.useState<PanelTabId>("care_treatment");

  if (!centerId) return null;

  return (
    <section className={styles.workspace}>
      <div className={styles.workspaceHeader}>
        <div>
          <div className={styles.sectionTitle}>محتوای پروفایل مرکز</div>
          <p className={styles.sectionHint}>
            مراقبت، فعالیت‌ها، ملاقات، امکانات و سوالات متداول را از تب‌های زیر
            مدیریت کنید.
          </p>
        </div>
      </div>

      <div className={styles.tabBar} role="tablist" aria-label="محتوای پروفایل">
        {PANEL_TABS.map(tab => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={`${styles.tabButton}${
                selected ? ` ${styles.tabButtonActive}` : ""
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className={styles.tabPanel} role="tabpanel">
        {activeTab === "care_treatment" ? (
          <CenterCareItemsManager
            centerId={centerId}
            token={token}
            compact
          />
        ) : null}
        {activeTab === "daily_life" ? (
          <CenterDailyLifeManager
            centerId={centerId}
            token={token}
            compact
          />
        ) : null}
        {activeTab === "family_visit" ? (
          <CenterVisitPolicyManager
            centerId={centerId}
            token={token}
            compact
          />
        ) : null}
        {activeTab === "amenities" ? (
          <CenterAmenitiesManager centerId={centerId} token={token} />
        ) : null}
        {activeTab === "faq" ? (
          <CenterFaqManager centerId={centerId} token={token} compact />
        ) : null}
      </div>
    </section>
  );
}

export default CenterPanelFeatures;
