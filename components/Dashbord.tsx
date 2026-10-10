import * as React from "react";
import {
  PlasmicDashbord,
  DefaultDashbordProps
} from "./plasmic/sayban/PlasmicDashbord";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { useBusyActiveSelectOverride } from "./panel/useBusyActiveSelectOverride";
import PanelDashboardChartLoading from "./panel/PanelDashboardChartLoading";
import { useProfileImageSaveOverride } from "./panel/useProfileImageSaveOverride";

export interface DashbordProps extends DefaultDashbordProps {}

function Dashbord_(props: DashbordProps, ref: HTMLElementRefOf<"div">) {
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const activeOverride = useBusyActiveSelectOverride("active");
  const profileImageOverride = useProfileImageSaveOverride(rootRef);
  const overrides = React.useMemo(
    () => ({
      ...activeOverride,
      ...profileImageOverride,
      // Only the dashboard chart ApiRequest (`panel/dashboard/chart`).
      chart: {
        props: {
          loadingDisplay: <PanelDashboardChartLoading />
        }
      }
    }),
    [activeOverride, profileImageOverride]
  );

  return (
    <PlasmicDashbord
      root={{
        ref: (node: HTMLDivElement | null) => {
          rootRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref)
            (ref as React.MutableRefObject<HTMLDivElement | null>).current =
              node;
        }
      }}
      {...props}
      overrides={overrides}
    />
  );
}

const Dashbord = React.forwardRef(Dashbord_);
export default Dashbord;
