import * as React from "react";
import {
  PlasmicCenterUser,
  DefaultCenterUserProps
} from "./plasmic/sayban/PlasmicCenterUser";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { useBusyActiveSelectOverride } from "./panel/useBusyActiveSelectOverride";

export interface CenterUserProps extends DefaultCenterUserProps {}

function CenterUser_(props: CenterUserProps, ref: HTMLElementRefOf<"div">) {
  const activeOverride = useBusyActiveSelectOverride("active");
  return (
    <PlasmicCenterUser root={{ ref }} {...props} overrides={activeOverride} />
  );
}

const CenterUser = React.forwardRef(CenterUser_);
export default CenterUser;
