import * as React from "react";
import {
  PlasmicReservationItem,
  DefaultReservationItemProps,
  type PlasmicReservationItem__OverridesType
} from "./plasmic/sayban/PlasmicReservationItem";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { classNames } from "@plasmicapp/react-web";
import { withReservationDisplayUser } from "./reservations/reservationDisplayPerson";
import PanelReservationUserInfo from "./reservations/PanelReservationUserInfo";
import PanelInterviewSlotsManager from "./reservations/PanelInterviewSlotsManager";
import {
  panelViewerFromToken,
  sanitizePanelReservation
} from "./reservations/sanitizePanelReservation";
import { PANEL_AUTH_COOKIE_NAME, readCookie } from "@/lib/authCookies";
import { reservationDisplayTime } from "./reservation/visitBooking";
import { isNurseStaffingReservation } from "./reservation/reservationDetailsModel";
import styles from "./ReservationItem.module.css";

export interface ReservationItemProps extends DefaultReservationItemProps {}

function ReservationItem_(
  props: ReservationItemProps,
  ref: HTMLElementRefOf<"div">
) {
  const rawItem = props.currentItem as Record<string, unknown> | null | undefined;
  const viewer = React.useMemo(
    () => panelViewerFromToken(readCookie(PANEL_AUTH_COOKIE_NAME)),
    []
  );
  const sanitizedItem = React.useMemo(() => {
    if (!rawItem) return rawItem;
    return sanitizePanelReservation(rawItem, viewer) as Record<string, unknown>;
  }, [rawItem, viewer]);
  const currentItem = withReservationDisplayUser(sanitizedItem);
  // `start_time` is Tehran wall clock; the generated node shifted it by +3:30.
  const posttime = reservationDisplayTime(rawItem?.start_time);
  const showInterviewSlots = isNurseStaffingReservation(
    (currentItem || null) as never
  );

  const overrides = React.useMemo<PlasmicReservationItem__OverridesType>(
    () => ({
      uploudeTime: {
        props: {
          posttime
        }
      },
      topics: {
        render: (renderProps: any, DefaultTopics: any) => (
          <div className={styles.topicAndUser}>
            <DefaultTopics {...renderProps} />
            {String(renderProps.selected ?? "1") === "1" ? (
              <PanelReservationUserInfo reservation={currentItem} />
            ) : null}
            {showInterviewSlots && currentItem?.id ? (
              <PanelInterviewSlotsManager
                reservationId={String(currentItem.id)}
                centerId={
                  (currentItem.center_id as string | number | null) ??
                  props.centerId ??
                  viewer.centerId
                }
                staffId={currentItem.staff_id as string | number | null}
                enabled
              />
            ) : null}
          </div>
        )
      }
    }),
    [currentItem, posttime, props.centerId, showInterviewSlots, viewer.centerId]
  );

  return (
    <PlasmicReservationItem
      {...props}
      currentItem={currentItem}
      root={{
        ref,
        className: classNames(styles.enhancedReservation)
      }}
      overrides={overrides}
    />
  );
}

const ReservationItem = React.forwardRef(ReservationItem_);
export default ReservationItem;
