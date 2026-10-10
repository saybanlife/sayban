import * as React from "react";
import CollapsiblePanelCard from "./CollapsiblePanelCard";
import CenterFactsPanels from "./CenterFactsPanels";
import CenterGalleryManager from "./CenterGalleryManager";
import CenterBannerManager from "./CenterBannerManager";
import CenterCareItemsManager from "./CenterCareItemsManager";
import CenterDailyLifeManager from "./CenterDailyLifeManager";
import CenterVisitPolicyManager from "./CenterVisitPolicyManager";
import CenterAmenitiesManager from "./CenterAmenitiesManager";
import CenterFaqManager from "./CenterFaqManager";
import { usePanelApi } from "./usePanelApi";
import { isPureNursingCenter } from "../centerPage/centerEnumLocales";
import styles from "./CenterPanelWorkspace.module.css";

type CenterPanelWorkspaceProps = {
  centerId?: string | number;
  token?: string;
  /** Notifies CenterPage so the preview card (rendered in the sidebar) reloads. */
  onChanged?: () => void;
};

export function CenterPanelWorkspace({
  centerId,
  token,
  onChanged
}: CenterPanelWorkspaceProps) {
  const api = usePanelApi(token);
  const [careDomain, setCareDomain] = React.useState<unknown>(null);

  React.useEffect(() => {
    if (!centerId) return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await api.fetchCenterFacts(centerId);
        if (!cancelled) setCareDomain(result?.care_domain ?? null);
      } catch {
        if (!cancelled) setCareDomain(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, centerId]);

  if (!centerId) return null;

  const bump = () => onChanged?.();
  // Pure nursing centers do not use elderly residential profile cards.
  const hideElderlyProfileCards = isPureNursingCenter(careDomain);

  return (
    <div className={styles.workspace} data-sayban-workspace="true">
      <div className={styles.mainCol}>
        <CollapsiblePanelCard
          title="اطلاعات مرکز"
          hint="اطلاعات کلی و کلیدی مرکز را اینجا مدیریت کنید."
          defaultOpen
          keepMounted
        >
          {/* Legacy Plasmic center-details card is moved in here by CenterPage. */}
          <div data-sayban-legacy-slot="center-info" />
          <CenterFactsPanels
            centerId={centerId}
            token={token}
            unified
            onSaved={() => {
              bump();
              void api.fetchCenterFacts(centerId).then(result => {
                setCareDomain(result?.care_domain ?? null);
              });
            }}
          />
        </CollapsiblePanelCard>

        <CollapsiblePanelCard
          title="بنر صفحه مرکز"
          hint="بنر اختصاصی بالای صفحه عمومی مرکز را با نسبت ۱۶:۹ مدیریت کنید."
          defaultOpen
        >
          <CenterBannerManager
            centerId={centerId}
            token={token}
            onChanged={bump}
          />
        </CollapsiblePanelCard>

        <CollapsiblePanelCard
          title="تصاویر مرکز"
          hint="تصویر اصلی و گالری مرکز."
          defaultOpen
        >
          <CenterGalleryManager
            centerId={centerId}
            token={token}
            onChanged={bump}
          />
        </CollapsiblePanelCard>

        {hideElderlyProfileCards ? null : (
          <>
            <CollapsiblePanelCard title="مراقبت و درمان" defaultOpen={false}>
              <CenterCareItemsManager
                centerId={centerId}
                token={token}
                compact
              />
            </CollapsiblePanelCard>

            <CollapsiblePanelCard
              title="برنامه روزانه و فعالیت‌ها"
              hint="گزینه‌های فعال زندگی روزمره سالمندان."
              defaultOpen={false}
            >
              <CenterDailyLifeManager
                centerId={centerId}
                token={token}
                compact
              />
            </CollapsiblePanelCard>

            <CollapsiblePanelCard title="ملاقات خانواده" defaultOpen={false}>
              <CenterVisitPolicyManager
                centerId={centerId}
                token={token}
                compact
              />
            </CollapsiblePanelCard>

            <CollapsiblePanelCard title="امکانات" defaultOpen={false}>
              <CenterAmenitiesManager centerId={centerId} token={token} />
            </CollapsiblePanelCard>
          </>
        )}

        <CollapsiblePanelCard title="سوالات متداول" defaultOpen={false}>
          <CenterFaqManager centerId={centerId} token={token} compact />
        </CollapsiblePanelCard>
      </div>
    </div>
  );
}

export default CenterPanelWorkspace;
