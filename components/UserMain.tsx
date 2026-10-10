import * as React from "react";
import {
  PlasmicUserMain,
  DefaultUserMainProps
} from "./plasmic/sayban/PlasmicUserMain";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { useRouter } from "next/router";
import { useBusyActiveSelectOverride } from "./panel/useBusyActiveSelectOverride";
import { panelAppHref } from "@/lib/panelRouteParams";

export interface UserMainProps extends DefaultUserMainProps {}

function UserMain_(props: UserMainProps, ref: HTMLElementRefOf<"div">) {
  const router = useRouter();
  const activeOverride = useBusyActiveSelectOverride("active");
  return (
    <PlasmicUserMain
      root={{ ref }}
      {...props}
      overrides={{
        ...activeOverride,
        button3: {
          render: (buttonProps: any, ButtonComponent: any) => {
            const { onClick: _ignoreGeneratedHistoryBack, ...rest } =
              buttonProps ?? {};
            return (
              <ButtonComponent
                {...rest}
                onClick={() => void router.push(panelAppHref("/panel/users"))}
              />
            );
          }
        }
      }}
    />
  );
}

const UserMain = React.forwardRef(UserMain_);
export default UserMain;
