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
import {
  reservationRows,
  reservationsForBookingTab,
  type BookingTab
} from "./reservation/bookingTabs";
import { ApiRequest } from "@/fragment/components/api-request";
import ItemBooking from "./ItemBooking";
import BookingCreateMenu from "./booking/BookingCreateMenu";
import InactiveBookingCard from "./booking/InactiveBookingCard";
import layoutStyles from "./BookingLayout.module.css";

export interface BookingProps extends DefaultBookingProps {}

/** Soft background refresh — long enough to avoid request spam on the booking page. */
const RESERVATION_POLL_MS = 30000;

function reservationListSignature(rows: ReservationRecord[]) {
  return rows
    .map(item =>
      [
        item.id,
        item.status,
        item.lifecycle_stage,
        item.payment_status,
        item.start_time,
        item.updated_at
      ].join(":")
    )
    .join("|");
}

function Booking_(props: BookingProps, ref: HTMLElementRefOf<"div">) {
  const router = useRouter();
  /** Bumps when entering booking with auth so the list refetches once. */
  const [visitKey, setVisitKey] = React.useState(0);
  const [selectedTab, setSelectedTab] = React.useState<BookingTab>("active");
  const [reservations, setReservations] = React.useState<ReservationRecord[]>(
    []
  );
  const reservationsRef = React.useRef(reservations);
  reservationsRef.current = reservations;
  const apiReady = Boolean(props.api);

  React.useEffect(() => {
    if (!apiReady) return;
    // Soft remount of the SWR key only — do not wipe the list (avoids jump).
    setVisitKey(key => key + 1);
  }, [apiReady, router.asPath]);

  const activeReservations = React.useMemo(
    () => reservationsForBookingTab(reservations, "active"),
    [reservations]
  );
  const completedReservations = React.useMemo(
    () => reservationsForBookingTab(reservations, "completed"),
    [reservations]
  );
  const visibleReservations =
    selectedTab === "active" ? activeReservations : completedReservations;

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

  const applyReservationPayload = React.useCallback((data: unknown) => {
    const next = reservationRows(data);
    const prev = reservationsRef.current;
    if (reservationListSignature(prev) === reservationListSignature(next)) {
      return false;
    }
    setReservations(next);
    return true;
  }, []);

  return (
    <>
      <PlasmicBooking
        {...props}
        root={{
          ref,
          className: [
            layoutStyles.bookingRoot,
            props.api ? layoutStyles.bookingVisible : "",
            props.className
          ]
            .filter(Boolean)
            .join(" ")
        }}
        overrides={{
        reservation: {
          render: (
            renderProps: React.ComponentProps<typeof ApiRequest>,
            DefaultApiRequest: typeof ApiRequest
          ) => (
            <DefaultApiRequest
              {...renderProps}
              fresh
              // Soft poll: ApiRequest keeps children mounted while revalidating.
              refreshInterval={RESERVATION_POLL_MS}
              shouldFetch={Boolean(renderProps.shouldFetch) && visitKey > 0}
              onSuccess={(data: unknown) => {
                const changed = applyReservationPayload(data);
                // Avoid Plasmic $state churn on identical soft-refresh payloads.
                if (changed) renderProps.onSuccess?.(data);
              }}
              onError={(error: unknown) => {
                // Keep the current list on soft-refresh failures.
                if (reservationsRef.current.length === 0) {
                  setReservations([]);
                  renderProps.onError?.(error);
                }
              }}
              config={{
                ...renderProps.config,
                headers: {
                  ...(renderProps.config?.headers as Record<string, string>),
                  // Changes SWR cache key per visit without affecting API query contract.
                  "X-Client-Visit": String(visitKey)
                }
              }}
            >
              {visibleReservations.length > 0 ? (
                <div
                  className={layoutStyles.requestList}
                  role="list"
                  data-booking-list={selectedTab}
                >
                  {visibleReservations.map(reservation => (
                    <div
                      key={String(reservation.id)}
                      className={layoutStyles.requestItem}
                      role="listitem"
                    >
                      {selectedTab === "completed" ? (
                        <InactiveBookingCard
                          reservation={reservation}
                          onOpenDetails={() => openReservationPage(reservation)}
                        />
                      ) : (
                        <ItemBooking
                          booking
                          home={reservation.service_location === "home"}
                          item={reservation}
                          goToDetails={() => openReservationPage(reservation)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : reservations.length > 0 ? (
                <div className={layoutStyles.tabEmpty} role="status">
                  درخواستی در این بخش وجود ندارد.
                </div>
              ) : (
                renderProps.children
              )}
            </DefaultApiRequest>
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
        header: {
          props: {
            slot2: (
              <div
                className={layoutStyles.tabs}
                role="tablist"
                aria-label="وضعیت درخواست‌ها"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedTab === "active"}
                  className={
                    selectedTab === "active"
                      ? layoutStyles.tabActive
                      : layoutStyles.tab
                  }
                  onClick={() => setSelectedTab("active")}
                >
                  فعال ({activeReservations.length.toLocaleString("fa-IR")})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedTab === "completed"}
                  className={
                    selectedTab === "completed"
                      ? layoutStyles.tabActive
                      : layoutStyles.tab
                  }
                  onClick={() => setSelectedTab("completed")}
                >
                  تمام‌شده ({completedReservations.length.toLocaleString("fa-IR")})
                </button>
              </div>
            )
          }
        },
        dialog: {
          props: {
            opendialog: false
          }
        }
        }}
      />
      {props.api ? <BookingCreateMenu /> : null}
    </>
  );
}

const Booking = React.forwardRef(Booking_);
export default Booking;
