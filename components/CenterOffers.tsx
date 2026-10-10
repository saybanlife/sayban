import * as React from "react";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import {
  DefaultCenterOffersProps
} from "./plasmic/sayban/PlasmicCenterOffers";
import NurseRequestFlow from "./nurseRequest/NurseRequestFlow";

export interface CenterOffersProps extends DefaultCenterOffersProps {}

function CenterOffers_(props: CenterOffersProps, ref: HTMLElementRefOf<"div">) {
  return (
    <div ref={ref} className={props.className}>
      <NurseRequestFlow
        token={props.token ? String(props.token) : undefined}
        profile={props.profile}
        id={props.id}
        userNew={props.userNew}
        userSelectOpendialog={props.userSelectOpendialog}
        onUserSelectOpendialogChange={props.onUserSelectOpendialogChange}
      />
    </div>
  );
}

const CenterOffers = React.forwardRef(CenterOffers_);
export default CenterOffers;
