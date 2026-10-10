import * as React from "react";
import { useRouter } from "next/router";
import ItemStaffs from "./ItemStaffs";
import { resolveApiUrl } from "../src/lib/apiRoutes";
import styles from "./NurseOffersList.module.css";

type NurseOffer = {
  id?: string | number;
  reservation_id?: string | number;
  staff_id?: string | number;
  center_id?: string | number;
  min_price?: string | number;
  max_price?: string | number;
  proposed_date?: string;
  proposed_time?: string;
  gender?: string;
  name?: string;
  center_name?: string;
  rating?: string | number;
  experience_years?: string | number;
  age?: string | number;
  bio?: string;
  specialty?: string;
  specialties?: string;
  avatar?: string;
  main_image?: string;
  [key: string]: unknown;
};

type NurseOffersListProps = {
  reservationId: string;
  token?: string;
  compact?: boolean;
  onStaffOpen?: (staffId: string) => void;
  onSelected?: (paymentId: string) => void;
};

const AVATAR_COLORS = ["#6f8a3a", "#c47a3a", "#5b6b95", "#8a6a3a", "#3a7a7a"];

function resultList(payload: unknown): NurseOffer[] {
  if (Array.isArray(payload)) return payload as NurseOffer[];
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { result?: unknown }).result)
  ) {
    return (payload as { result: NurseOffer[] }).result;
  }
  return [];
}

function faDigits(value: string | number) {
  return String(value).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

function offerName(offer: NurseOffer) {
  return String(offer.name || offer.staff_name || "مراقب").trim();
}

function offerPrice(offer: NurseOffer) {
  const min = Number(offer.min_price);
  const max = Number(offer.max_price);
  const amount = Number.isFinite(min)
    ? Number.isFinite(max) && max > min
      ? Math.round((min + max) / 2)
      : min
    : Number.isFinite(max)
      ? max
      : null;
  if (amount == null) return "";
  return `${amount.toLocaleString("fa-IR")} / ماه`;
}

function offerBio(offer: NurseOffer) {
  const parts: string[] = [];
  if (offer.gender) {
    parts.push(String(offer.gender) === "male" ? "مرد" : String(offer.gender) === "female" ? "زن" : String(offer.gender));
  }
  if (offer.age != null && offer.age !== "") {
    parts.push(`${faDigits(offer.age)} ساله`);
  }
  if (offer.experience_years != null && offer.experience_years !== "") {
    parts.push(`${faDigits(offer.experience_years)} سال سابقه`);
  }
  const specialty = offer.specialty || offer.specialties || offer.bio;
  if (specialty) parts.push(String(specialty));
  return parts.join(" / ");
}

function earliestStart(offer: NurseOffer) {
  if (!offer.proposed_date) return "";
  const raw = `${offer.proposed_date} ${offer.proposed_time || "00:00"}`.trim();
  const date = new Date(raw.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return String(offer.proposed_date);
  const weekday = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    weekday: "long"
  }).format(date);
  return `زودترین شروع: ${weekday}`;
}

function OfferCard({
  offer,
  index,
  loading,
  onSelect,
  onDetails
}: {
  offer: NurseOffer;
  index: number;
  loading: boolean;
  onSelect: () => void;
  onDetails?: () => void;
}) {
  const name = offerName(offer);
  const initial = name.charAt(0) || "؟";
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length]!;
  const rating =
    offer.rating != null && offer.rating !== ""
      ? faDigits(Number(offer.rating).toFixed(1))
      : "";
  const price = offerPrice(offer);
  const bio = offerBio(offer);
  const start = earliestStart(offer);

  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <div
          className={styles.avatar}
          style={{ background: color }}
          aria-hidden="true"
        >
          {offer.avatar || offer.main_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={String(offer.avatar || offer.main_image)} alt="" />
          ) : (
            initial
          )}
        </div>
        <div className={styles.meta}>
          <div className={styles.nameRow}>
            <strong>{name}</strong>
            {rating ? (
              <span className={styles.rating}>
                ★ {rating}
              </span>
            ) : null}
          </div>
          {bio ? <p className={styles.bio}>{bio}</p> : null}
        </div>
      </div>

      {offer.center_name ? (
        <div className={styles.centerBar}>{String(offer.center_name)}</div>
      ) : null}

      <div className={styles.priceRow}>
        <div>
          {price ? <strong className={styles.price}>{price}</strong> : null}
          {start ? <div className={styles.start}>{start}</div> : null}
        </div>
        {onDetails ? (
          <button type="button" className={styles.more} onClick={onDetails}>
            جزئیات بیشتر ›
          </button>
        ) : null}
      </div>

      <button
        type="button"
        className={styles.selectBtn}
        disabled={loading}
        onClick={onSelect}
      >
        {loading ? "در حال انتخاب…" : "انتخاب برای مصاحبه"}
      </button>
    </article>
  );
}

export default function NurseOffersList({
  reservationId,
  token,
  compact = false,
  onStaffOpen,
  onSelected
}: NurseOffersListProps) {
  const router = useRouter();
  const [offers, setOffers] = React.useState<NurseOffer[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [selectingId, setSelectingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const url = new URL(resolveApiUrl("panel/offer-staff"));
        url.searchParams.set("id", reservationId);
        const response = await fetch(url.toString(), {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
          signal: controller.signal
        });
        if (!response.ok) throw new Error("offers-request-failed");
        setOffers(resultList(await response.json()));
      } catch (requestError) {
        if ((requestError as Error).name !== "AbortError") {
          setError("دریافت پیشنهادهای پرستار با خطا روبه‌رو شد.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    if (reservationId) void load();
    return () => controller.abort();
  }, [reservationId, token]);

  const selectOffer = async (offer: NurseOffer) => {
    const offerId = String(offer.id ?? offer.staff_id ?? "");
    if (!offerId || selectingId) return;
    setSelectingId(offerId);
    setError("");
    try {
      const min = Number(offer.min_price) || 0;
      const max = Number(offer.max_price) || min;
      const response = await fetch(resolveApiUrl("reservations/steff/update"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          id: offer.reservation_id || reservationId,
          staff_id: offer.staff_id ?? offer.id,
          center_id: offer.center_id,
          final_price: ((min + max) / 2) * 0.2,
          start_time: `${offer.proposed_date || ""} ${offer.proposed_time || ""}`.trim(),
          preferred_staff_gender: offer.gender,
          payment_method: "online",
          min_price: offer.min_price,
          max_price: offer.max_price
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error("select-failed");
      const paymentId = String(payload.result ?? reservationId);
      if (onSelected) onSelected(paymentId);
      else void router.push(`/home/pay_${paymentId}`);
    } catch {
      setError("انتخاب این پرستار انجام نشد. دوباره تلاش کنید.");
    } finally {
      setSelectingId(null);
    }
  };

  if (loading) {
    return (
      <div className={styles.skeletons} aria-label="در حال دریافت پیشنهادها">
        {[1, 2].map(item => (
          <div key={item} className={`${styles.skeleton} shimmer`} />
        ))}
      </div>
    );
  }

  return (
    <section className={`${styles.section} ${compact ? styles.compact : ""}`}>
      <div className={styles.heading}>
        <div>
          <strong>
            {faDigits(offers.length)} پیشنهاد
          </strong>
          <span> - مراقب مناسب را انتخاب کنید</span>
        </div>
        {offers.length ? (
          <span className={styles.actionBadge}>اقدام شما</span>
        ) : null}
      </div>
      {error ? (
        <div className={styles.error} role="alert">
          {error}
        </div>
      ) : null}
      {!offers.length && !error ? (
        <div className={styles.empty}>
          هنوز پیشنهادی برای این درخواست ثبت نشده است.
        </div>
      ) : null}
      <div className={styles.list}>
        {offers.map((offer, index) => {
          const offerId = String(offer.id ?? offer.staff_id ?? index);
          if (compact) {
            return (
              <OfferCard
                key={offerId}
                offer={offer}
                index={index}
                loading={selectingId === offerId}
                onSelect={() => void selectOffer(offer)}
                onDetails={
                  onStaffOpen && offer.staff_id
                    ? () => onStaffOpen(String(offer.staff_id))
                    : undefined
                }
              />
            );
          }
          return (
            <ItemStaffs
              key={offerId}
              item={offer}
              offer={offers}
              status="offersReceived"
              loading={selectingId === offerId}
              goToCenter={() => selectOffer(offer)}
              onClick={
                onStaffOpen && offer.staff_id
                  ? () => onStaffOpen(String(offer.staff_id))
                  : undefined
              }
            />
          );
        })}
      </div>
    </section>
  );
}
