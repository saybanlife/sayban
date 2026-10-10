import * as React from "react";
import {
  PlasmicTopPage,
  DefaultTopPageProps
} from "./plasmic/sayban/PlasmicTopPage";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { useRouter } from "next/router";
import { logoutPanel } from "@/lib/panelSession";
import PanelDarkModeSwitch from "./panel/PanelDarkModeSwitch";
import PanelMobileNavButton from "./panel/PanelMobileNavButton";

export interface TopPageProps extends DefaultTopPageProps {}

function TopPage_(props: TopPageProps, ref: HTMLElementRefOf<"div">) {
  const router = useRouter();

  // Bell opens the panel inbox. Logout must hard-navigate (see panelSession).
  // Use `render` so the generated soft cookie+router.push handler never runs.
  return (
    <PlasmicTopPage
      root={{ ref }}
      {...props}
      question={() => {
        void router.push("/panel/notifications");
      }}
      button2={{
        render: (ps: any, Comp: React.ComponentType<any>) => {
          const { onClick: _ignore, ...rest } = ps ?? {};
          return (
            <Comp
              {...rest}
              onClick={() => {
                logoutPanel();
              }}
            />
          );
        }
      }}
      popover={{
        render: (ps: any, Comp: React.ComponentType<any>) => (
          <>
            <PanelMobileNavButton />
            <PanelDarkModeSwitch />
            <Comp {...ps} />
          </>
        )
      }}
    />
  );
}

const TopPage = React.forwardRef(TopPage_);
export default TopPage;
