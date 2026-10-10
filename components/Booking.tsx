import * as React from "react";
import { useRouter } from "next/router";
import {
  PlasmicBooking,
  DefaultBookingProps
} from "./plasmic/sayban/PlasmicBooking";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import {
  RESERVATION_CACHE_KEY,
  type ReservationRecord
} from "./reservation/reservationDetailsModel";
import { ApiRequest } from "@/fragment/components/api-request";
import layoutStyles from "./BookingLayout.module.css";

export interface BookingProps extends DefaultBookingProps {}

/** Matches the support chat's polling cadence (`SupportChat.tsx`). */
const RESERVATION_POLL_MS = 10000;

function Booking_(props: BookingProps, ref: HTMLElementRefOf<"div">) {
  const router = useRouter();
  /** Bumps on every visit to the booking page so reservation list is always refetched. */
  const [visitKey, setVisitKey] = React.useState(0);

  React.useEffect(() => {
    if (!props.api) return;
    setVisitKey(key => key + 1);
  }, [props.api, router.asPath]);

  const openReservationPage = React.useCallback(
    (item: ReservationRecord | null | undefined) => {
      if (!item?.id) return;
      try {
        window.sessionStorage.setItem(
          RESERVATION_CACHE_KEY,
          JSON.stringify(item)
        );
      } catch {
        /* ignore quota */
      }
      const page =
        typeof router.query.page === "string" && router.query.page
          ? router.query.page
          : "home";
      router.push(`/${page}/reservation_${item.id}`);
    },
    [router]
  );

  return (
    <PlasmicBooking
      {...props}
      root={{ ref, className: layoutStyles.bookingRoot }}
      overrides={{
        reservation: {
          render: (
            renderProps: React.ComponentProps<typeof ApiRequest>,
            DefaultApiRequest: typeof ApiRequest
          ) => (
            <DefaultApiRequest
              {...renderProps}
              fresh
              // Reservation status changes server-side (confirmed, cancelled,
              // paid), so keep the list current without a manual refresh.
              refreshInterval={RESERVATION_POLL_MS}
              shouldFetch={Boolean(renderProps.shouldFetch) && visitKey > 0}
              config={{
                ...renderProps.config,
                headers: {
                  ...(renderProps.config?.headers as Record<string, string>),
                  // Changes SWR cache key per visit without affecting API query contract.
                  "X-Client-Visit": String(visitKey)
                }
              }}
            />
          )
        },
        itemBooking: {
          render: (renderProps, DefaultItemBooking) => (
            <DefaultItemBooking
              {...renderProps}
              goToDetails={() =>
                openReservationPage(
                  (renderProps as { item?: ReservationRecord }).item
                )
              }
            />
          )
        },
        dialog: {
          props: {
            opendialog: false
          }
        }
      }}
    />
  );
}

const Booking = React.forwardRef(Booking_);
export default Booking;
