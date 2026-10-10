import * as React from "react";
import {
  PlasmicItemBooking,
  DefaultItemBookingProps,
  type PlasmicItemBooking__OverridesType
} from "./plasmic/sayban/PlasmicItemBooking";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { reservationDisplayTime } from "./reservation/visitBooking";
import type { ReservationRecord } from "./reservation/reservationDetailsModel";
import HomeStatusCardNext from "./home/HomeStatusCardNext";

export interface ItemBookingNextProps extends DefaultItemBookingProps {
  token?: string;
  onReservationChange?: (reservation: ReservationRecord) => void;
}

/** Drop-in ItemBooking with visit post–visit Home status card. */
function ItemBookingNext_(props: ItemBookingNextProps, ref: HTMLElementRefOf<"div">) {
  const {
    home,
    item,
    token,
    onReservationChange,
    goToDetails,
    pay,
    className,
    ...rest
  } = props;

  const startTime = (item as { start_time?: unknown } | null | undefined)
    ?.start_time;

  const overrides = React.useMemo<PlasmicItemBooking__OverridesType>(
    () => ({
      uploudeTime: { props: { posttime: reservationDisplayTime(startTime) } }
    }),
    [startTime]
  );

  if (home && item) {
    return (
      <HomeStatusCardNext
        reservation={item as ReservationRecord}
        className={className}
        token={token}
        onOpenDetails={() => goToDetails?.(undefined)}
        onPay={() => pay?.()}
        onChange={onReservationChange}
      />
    );
  }

  return (
    <PlasmicItemBooking
      root={{ ref }}
      {...rest}
      home={home}
      item={item}
      goToDetails={goToDetails}
      pay={pay}
      className={className}
      overrides={overrides}
    />
  );
}

const ItemBookingNext = React.forwardRef(ItemBookingNext_);
export default ItemBookingNext;
