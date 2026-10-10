import * as React from "react";
import { createPortal } from "react-dom";
import {
  PlasmicCenterPage,
  DefaultCenterPageProps
} from "./plasmic/sayban/PlasmicCenterPage";
import sty from "./plasmic/sayban/PlasmicCenterPage.module.css";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { useRouter } from "next/router";
import { navigateToCentersList } from "@/lib/panelCenterNavigation";
import CenterPanelWorkspace from "./centerPanel/CenterPanelWorkspace";
import CenterPreviewCard from "./centerPanel/CenterPreviewCard";
import {
  adoptLegacyCenterInfo,
  enhanceLegacyPanelCards
} from "./centerPanel/legacyCardCollapse";
import { usePanelApi } from "./centerPanel/usePanelApi";
import { isPureNursingCenter } from "./centerPage/centerEnumLocales";
import centerPageStyles from "./centerPage/CenterPage.module.css";
import panelChromeStyles from "./centerPanel/CenterPanelPageChrome.module.css";
import { useBusyActiveSelectOverride } from "./panel/useBusyActiveSelectOverride";
import { useProfileImageSaveOverride } from "./panel/useProfileImageSaveOverride";

export interface CenterPageProps extends DefaultCenterPageProps {}

/** Legacy Plasmic cards that are replaced by the workspace and stay hidden. */
const REPLACED_CARD_CLASSES = [sty.freeBox__vRowu, sty.freeBox__eog3I];

/** «اطلاعات کاربری» keeps its title row one level below the card root. */
function sidebarHeader(card: HTMLElement): HTMLElement | null {
  return (
    card.querySelector<HTMLElement>(`.${sty.freeBox__ooM5}`) ??
    (card.firstElementChild as HTMLElement | null)
  );
}

function isSuperAdminRole(props: CenterPageProps) {
  const roleVariant = String(props.role ?? "");
  const rule = String(props.rule ?? "");
  return (
    roleVariant === "superAdmin" ||
    roleVariant === "super_admin" ||
    rule === "super_admin"
  );
}

function CenterPage_(props: CenterPageProps, ref: HTMLElementRefOf<"div">) {
  const router = useRouter();
  const { id, token } = props;
  const canDeleteReviews = isSuperAdminRole(props);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  // The column that holds every white section card («تصاویر», «ساعت کار», …).
  const [cardColumn, setCardColumn] = React.useState<HTMLElement | null>(null);
  // Sidebar column that hosts «اطلاعات کاربری» and the preview card.
  const [sidebarColumn, setSidebarColumn] = React.useState<HTMLElement | null>(
    null
  );
  const [previewKey, setPreviewKey] = React.useState(0);
  const bumpPreview = React.useCallback(() => setPreviewKey(k => k + 1), []);
  const api = usePanelApi(token);
  const [careDomain, setCareDomain] = React.useState<unknown>(null);
  const hideWorkingHours = isPureNursingCenter(careDomain);
  const activeOverride = useBusyActiveSelectOverride("active", {
    centerId: id,
    token,
    showStatusToast: true
  });
  const profileImageOverride = useProfileImageSaveOverride(
    rootRef,
    bumpPreview
  );

  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await api.fetchCenterFacts(id);
        if (!cancelled) setCareDomain(result?.care_domain ?? null);
      } catch {
        if (!cancelled) setCareDomain(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, id, previewKey]);

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const sync = () => {
      const column = root.querySelector<HTMLElement>(`.${sty.freeBox___58887}`);
      setCardColumn(current => (current === column ? current : column));

      // «اطلاعات مرکز» details belong in the workspace card, not the sidebar.
      const slot = root.querySelector<HTMLElement>(
        '[data-sayban-legacy-slot="center-info"]'
      );
      const details = root.querySelector<HTMLElement>(`.${sty.freeBox__sNve7}`);
      if (slot && details) adoptLegacyCenterInfo(details, slot);

      const hoursCard = root.querySelector<HTMLElement>(`.${sty.freeBox__oArX}`);
      if (hoursCard) {
        hoursCard.style.display = hideWorkingHours ? "none" : "";
        hoursCard.setAttribute(
          "data-sayban-hide-working-hours",
          hideWorkingHours ? "true" : "false"
        );
      }

      if (column)
        enhanceLegacyPanelCards(column, {
          skipClasses: [
            ...REPLACED_CARD_CLASSES,
            ...(hideWorkingHours ? [sty.freeBox__oArX] : [])
          ]
        });

      const sidebar = root.querySelector<HTMLElement>(`.${sty.freeBox___8TiSu}`);
      setSidebarColumn(current => (current === sidebar ? current : sidebar));
      if (sidebar)
        enhanceLegacyPanelCards(sidebar, {
          // The details card is adopted into the workspace, never toggled here.
          skipClasses: [sty.freeBox__sNve7],
          headerFor: sidebarHeader
        });
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [id, hideWorkingHours]);

  return (
    <>
      <PlasmicCenterPage
        root={{
          ref: (node: HTMLDivElement | null) => {
            rootRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref)
              (ref as React.MutableRefObject<HTMLDivElement | null>).current =
                node;
          },
          className: [
            centerPageStyles.pageRoot,
            panelChromeStyles.panelRoot,
            props.className
          ]
            .filter(Boolean)
            .join(" ")
        }}
        {...props}
        overrides={{
          ...activeOverride,
          ...profileImageOverride,
          button3: {
            render: (buttonProps: any, ButtonComponent: any) => {
              const { onClick: _ignoreGeneratedHistoryBack, ...rest } =
                buttonProps ?? {};
              return (
                <ButtonComponent
                  {...rest}
                  onClick={() => navigateToCentersList(router)}
                />
              );
            }
          },
          // Services section removed from panel UX.
          addServise2: {
            wrap: () => null
          },
          // Legacy gallery replaced by CenterGalleryManager inside the workspace.
          imageEdit: {
            wrap: () => null
          },
          button2: {
            wrap: () => null
          },
          // Pure nursing centers do not use residential working-hours editing.
          ...(hideWorkingHours
            ? {
                timeWeek: {
                  wrap: () => null
                }
              }
            : {}),
          comments: {
            props: {
              canDeleteReviews,
              token
            }
          },
          centerInfo: {
            props: {
              hideTypeFields: true
            }
          }
        }}
      />
      {cardColumn
        ? createPortal(
            <CenterPanelWorkspace
              centerId={id}
              token={token}
              onChanged={bumpPreview}
            />,
            cardColumn
          )
        : null}
      {sidebarColumn
        ? createPortal(
            <CenterPreviewCard
              centerId={id}
              token={token}
              refreshKey={previewKey}
            />,
            sidebarColumn
          )
        : null}
    </>
  );
}

const CenterPage = React.forwardRef(CenterPage_);
export default CenterPage;
