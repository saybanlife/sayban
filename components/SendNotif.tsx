import * as React from "react";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import {
  DefaultSendNotifProps
} from "./plasmic/sayban/PlasmicSendNotif";
import MainPageSendNotif from "./MainPageSendNotif";

/**
 * Completes the unfinished Plasmic «SendNotif» surface by hosting the
 * panel-ready sender. Kept as the public component name so Studio wiring can
 * point here later without another rename.
 */
export interface SendNotifProps extends DefaultSendNotifProps {
  className?: string;
}

function SendNotif_(props: SendNotifProps, ref: HTMLElementRefOf<"div">) {
  const { token, className } = props;
  return (
    <div ref={ref} className={className} style={{ width: "100%", height: "100%" }}>
      <MainPageSendNotif token={token} />
    </div>
  );
}

const SendNotif = React.forwardRef(SendNotif_);
export default SendNotif;
