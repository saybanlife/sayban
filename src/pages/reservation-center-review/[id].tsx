import * as React from "react";
import { useRouter } from "next/router";

import ReservationCenterReviewPage from "../../../components/reservation/ReservationCenterReviewPage";

export default function ReservationCenterReviewRoute() {
  const router = useRouter();
  const id = Array.isArray(router.query.id)
    ? router.query.id[0]
    : router.query.id;
  if (!id || typeof id !== "string") return null;
  return (
    <ReservationCenterReviewPage
      reservationId={id}
      onBack={() => void router.push("/home/")}
    />
  );
}
