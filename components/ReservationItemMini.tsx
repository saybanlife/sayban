import * as React from "react";
import {
  PlasmicReservationItemMini,
  DefaultReservationItemMiniProps,
  type PlasmicReservationItemMini__OverridesType
} from "./plasmic/sayban/PlasmicReservationItemMini";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { PANEL_AUTH_COOKIE_NAME, readCookie } from "@/lib/authCookies";
import {
  panelViewerFromToken,
  sanitizePanelReservation
} from "./reservations/sanitizePanelReservation";
import { reservationDisplayTime } from "./reservation/visitBooking";

export interface ReservationItemMiniProps extends DefaultReservationItemMiniProps {}

function ReservationItemMini_(
  props: ReservationItemMiniProps,
  ref: HTMLElementRefOf<"div">
) {
  const rawItem = props.currentItem as Record<string, unknown> | null | undefined;
  const viewer = React.useMemo(
    () => panelViewerFromToken(readCookie(PANEL_AUTH_COOKIE_NAME)),
    []
  );
  const currentItem = React.useMemo(() => {
    if (!rawItem) return rawItem;
    return sanitizePanelReservation(rawItem, viewer) as Record<string, unknown>;
  }, [rawItem, viewer]);
  // `start_time` is Tehran wall clock; the generated node shifted it by +3:30.
  const posttime = reservationDisplayTime(rawItem?.start_time);

  const overrides = React.useMemo<PlasmicReservationItemMini__OverridesType>(
    () => ({
      uploudeTime: {
        props: {
          posttime
        }
      }
    }),
    [posttime]
  );

  return (
    <PlasmicReservationItemMini
      root={{ ref }}
      {...props}
      currentItem={currentItem}
      overrides={overrides}
    />
  );
}

const ReservationItemMini = React.forwardRef(ReservationItemMini_);
export default ReservationItemMini;
