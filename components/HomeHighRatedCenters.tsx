import * as React from "react";
import { useRouter } from "next/router";
import { ApiRequest } from "@/fragment/components/api-request";
import { PUBLIC_ROUTES } from "@/lib/apiRoutes";
import {
  PUBLIC_AUTH_COOKIE_NAME,
  resolvePublicAuthToken
} from "@/lib/publicAuthToken";
import { buildCenterRoute } from "./centerNavigation";
import { centerRating } from "./centers/centerListFilters";
import { readCookie } from "./support/supportTypes";
import StarFilledIcon from "./plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__StarFilled";
import MapPinIcon from "./plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__MapPin";
import ChevronLeftIcon from "./plasmic/sayban/icons/PlasmicIcon__ChevronLeft";
import styles from "./HomeHighRatedCenters.module.css";

const CACHE_KEY = "home-high-rated-centers-v2";
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CARDS = 12;
const MIN_RATE = 4;

export type HomeHighRatedCenter = {
  id: string;
  name: string;
  rating: number;
  image: string;
  location: string;
};

type HomeHighRatedCentersProps = {
  className?: string;
  /** Optional category slug used by «مشاهده همه» to open a centers list. */
  viewAllSlug?: string;
  /** Public JWT from Homepage `$state.token` when available. */
  token?: string;
};

function asObject(item: unknown): Record<string, unknown> {
  if (!item || typeof item !== "object") return {};
  return item as Record<string, unknown>;
}

function readString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function formatRating(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return (Math.round(value * 10) / 10).toFixed(1);
}

function formatLocation(row: Record<string, unknown>): string {
  const city = readString(row.city);
  const area = readString(row.area ?? row.district ?? row.region);
  if (city && area && area !== city) {
    if (/^\d+$/.test(area) || /^منطقه/.test(area)) {
      return area.startsWith("منطقه")
        ? `${city}، ${area}`
        : `${city}، منطقه ${area}`;
    }
    return `${city}، ${area}`;
  }
  if (city) return city;
  if (area) return area;
  const address = readString(row.address);
  return address || "—";
}

function readImage(row: Record<string, unknown>): string {
  const raw = row.main_image ?? row.image ?? row.image_url ?? "";
  if (typeof raw === "string") return raw.trim();
  if (raw && typeof raw === "object" && "src" in raw) {
    return readString((raw as { src?: unknown }).src);
  }
  return "";
}

export function normalizeHighRatedCenters(
  payload: unknown,
  limit = MAX_CARDS
): HomeHighRatedCenter[] {
  const root = asObject(payload);
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(root.result)
      ? root.result
      : [];

  const mapped = rows
    .map(raw => {
      const row = asObject(raw);
      const id = readString(row.id);
      const name = readString(row.name ?? row.title);
      const rating = centerRating(row);
      if (!id || !name || rating < MIN_RATE) return null;
      return {
        id,
        name,
        rating,
        image: readImage(row),
        location: formatLocation(row)
      } satisfies HomeHighRatedCenter;
    })
    .filter((item): item is HomeHighRatedCenter => item != null);

  mapped.sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name, "fa"));
  return mapped.slice(0, limit);
}

function openCenter(pageBase: string, centerId: string) {
  try {
    window.sessionStorage.setItem("id", centerId);
  } catch {
    /* ignore */
  }
  return buildCenterRoute(pageBase, centerId);
}

export function HomeHighRatedCenters({
  className,
  viewAllSlug,
  token
}: HomeHighRatedCentersProps) {
  const router = useRouter();
  const [items, setItems] = React.useState<HomeHighRatedCenter[]>([]);

  const authToken = React.useMemo(
    () =>
      resolvePublicAuthToken(
        token || readCookie(PUBLIC_AUTH_COOKIE_NAME) || null
      ),
    [token]
  );

  const categorySlug = String(viewAllSlug || "").trim();

  const pageBase =
    typeof router.query.page === "string" && router.query.page
      ? router.query.page
      : "home";

  const goToCenter = React.useCallback(
    async (centerId: string) => {
      const route = openCenter(pageBase, centerId);
      if (route) await router.push(route);
    },
    [pageBase, router]
  );

  const goViewAll = React.useCallback(async () => {
    try {
      window.sessionStorage.setItem("sayban_centers_sort", "highest_rate");
    } catch {
      /* ignore */
    }
    if (categorySlug) {
      await router.push(`/${pageBase}/${encodeURIComponent(categorySlug)}`);
      return;
    }
    if (items[0]?.id) await goToCenter(items[0].id);
  }, [categorySlug, goToCenter, items, pageBase, router]);

  return (
    <>
      <ApiRequest
        method="GET"
        url={PUBLIC_ROUTES.centers}
        // `/centers` needs a category (or subcategory) slug; without it n8n
        // returns a placeholder empty row. Home passes the first category.
        params={{
          category: categorySlug,
          sort: "highest_rate"
        }}
        config={
          authToken
            ? { headers: { Authorization: `Bearer ${authToken}` } }
            : undefined
        }
        shouldFetch={Boolean(authToken && categorySlug)}
        cacheKey={`${CACHE_KEY}:${categorySlug}`}
        cacheTtlMs={CACHE_TTL_MS}
        loadingDisplay={null}
        errorDisplay={null}
        onSuccess={(data: unknown) => {
          setItems(normalizeHighRatedCenters(data));
        }}
        onError={() => {
          setItems([]);
        }}
      >
        {null}
      </ApiRequest>

      {items.length > 0 ? (
        <section
          className={[styles.root, className].filter(Boolean).join(" ")}
          aria-label="مراکز با امتیاز زیاد"
        >
          <div className={styles.header}>
            <div className={styles.titleRow}>
              <span className={styles.badge} aria-hidden>
                <StarFilledIcon />
              </span>
              <h2 className={styles.title}>مراکز با امتیاز زیاد</h2>
            </div>
            <button
              type="button"
              className={styles.viewAll}
              onClick={() => void goViewAll()}
            >
              مشاهده همه
              <ChevronLeftIcon className={styles.viewAllChevron} role="img" />
            </button>
          </div>

          <div className={styles.scroller}>
            {items.map(item => (
              <article key={item.id} className={styles.card}>
                <div className={styles.cardTop}>
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className={styles.avatar}
                      src={item.image}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <span className={styles.avatarFallback} aria-hidden>
                      {item.name.slice(0, 1)}
                    </span>
                  )}
                  <span className={styles.rating}>
                    <StarFilledIcon className={styles.ratingStar} />
                    {formatRating(item.rating)}
                  </span>
                </div>

                <h3 className={styles.name}>{item.name}</h3>
                <div className={styles.location}>
                  <MapPinIcon className={styles.locationPin} />
                  <span className={styles.locationText}>{item.location}</span>
                </div>

                <button
                  type="button"
                  className={styles.cta}
                  onClick={() => void goToCenter(item.id)}
                >
                  مشاهده مرکز
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

export default HomeHighRatedCenters;
