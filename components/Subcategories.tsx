import * as React from "react";
import { useRouter } from "next/router";
import {
  PlasmicSubcategories,
  DefaultSubcategoriesProps,
  type PlasmicSubcategories__OverridesType
} from "./plasmic/sayban/PlasmicSubcategories";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { ApiRequest } from "@/fragment/components/api-request";
import CentersTypeBanner from "./centers/CentersTypeBanner";
import headerStyles from "./centers/CentersHeaderAddress.module.css";
import { toDbEnumValue } from "./centerPage/centerEnumLocales";
import CurrentAddressChip from "./home/CurrentAddressChip";
import { fetchCurrentAddress } from "./home/currentAddressApi";
import {
  haversineKm,
  parseCoord,
  type UserAddress
} from "./home/currentAddressModel";
import {
  readCenterTypeFilter,
  readNearbyFilter,
  readRateFilter,
  readAvailabilityFilter,
  serializeFiltersForApi,
  type CentersFilters
} from "./centers/centerFilters";
import {
  filterCentersByAvailability,
  filterCentersByMinRate
} from "./centers/centerListFilters";

/** Centers list is more volatile than categories; still skip refetch on back-nav. */
const CENTERS_LIST_CACHE_TTL_MS = 15 * 60 * 1000;

export interface SubcategoriesProps extends DefaultSubcategoriesProps {}

type CentersParams = React.ComponentProps<typeof ApiRequest>["params"];

/** Stable, auth-free key so token hydration cannot bust the centers list cache. */
function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(src).sort()) {
      const next = src[key];
      if (next === undefined || next === null || next === "") continue;
      out[key] = stableValue(next);
    }
    return out;
  }
  return value;
}

function centersListCacheKey(params: CentersParams | undefined): string {
  return `centers:${JSON.stringify(stableValue(params ?? {}))}`;
}

function readSlugParts(slug: string | string[] | undefined): string[] {
  if (Array.isArray(slug)) {
    return slug.map(part => String(part).trim()).filter(Boolean);
  }
  if (typeof slug === "string" && slug.trim()) {
    return [slug.trim()];
  }
  return [];
}

function matchesCenterType(raw: unknown, wanted: string) {
  if (!wanted) return true;
  const dbWanted = toDbEnumValue("center_type", wanted) || wanted;
  const value = String(raw ?? "").trim();
  if (!value) return false;
  const dbValue = toDbEnumValue("center_type", value) || value;

  // A center that runs both shifts belongs in the روزانه list and in the
  // شبانه‌روزی list; exact matching used to drop it from both.
  if (dbValue === "comprehensive") return true;
  // Asking for «هر دو» means only centers that actually cover both.
  if (dbWanted === "comprehensive") return dbValue === "comprehensive";

  return (
    dbValue === dbWanted ||
    value === wanted ||
    value.toLowerCase() === wanted.toLowerCase()
  );
}

function centerCoords(row: Record<string, unknown>) {
  return {
    lat: parseCoord(row.latitude ?? row.lat),
    lng: parseCoord(row.longitude ?? row.lng ?? row.lon)
  };
}

function sortCentersByNearby(
  rows: unknown[],
  origin: { lat: number; lng: number }
) {
  return [...rows].sort((a, b) => {
    const aObj =
      a && typeof a === "object" ? (a as Record<string, unknown>) : {};
    const bObj =
      b && typeof b === "object" ? (b as Record<string, unknown>) : {};
    const ac = centerCoords(aObj);
    const bc = centerCoords(bObj);
    const aMissing = ac.lat == null || ac.lng == null;
    const bMissing = bc.lat == null || bc.lng == null;
    if (aMissing && bMissing) return 0;
    if (aMissing) return 1;
    if (bMissing) return -1;
    const da = haversineKm(origin.lat, origin.lng, ac.lat!, ac.lng!);
    const db = haversineKm(origin.lat, origin.lng, bc.lat!, bc.lng!);
    return da - db;
  });
}

function Subcategories_(
  props: SubcategoriesProps,
  ref: HTMLElementRefOf<"div">
) {
  const router = useRouter();
  const slugParts = React.useMemo(
    () => readSlugParts(router.query.slug as string | string[] | undefined),
    [router.query.slug]
  );
  const categorySlug = slugParts[0] || "";
  const subcategorySlug = slugParts[1] || "";
  const filterSlug = subcategorySlug || categorySlug || props.slug || "";
  const pageBase =
    typeof router.query.page === "string" && router.query.page
      ? router.query.page
      : "home";

  const [currentAddress, setCurrentAddress] =
    React.useState<UserAddress | null>(null);

  const [primedSort] = React.useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const value = window.sessionStorage.getItem("sayban_centers_sort");
      if (value) window.sessionStorage.removeItem("sayban_centers_sort");
      return value;
    } catch {
      return null;
    }
  });

  React.useEffect(() => {
    let alive = true;
    fetchCurrentAddress()
      .then(addr => {
        if (alive) setCurrentAddress(addr);
      })
      .catch(() => {
        if (alive) setCurrentAddress(null);
      });
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<UserAddress>).detail;
      if (detail) setCurrentAddress(detail);
      else {
        fetchCurrentAddress().then(addr => setCurrentAddress(addr));
      }
    };
    window.addEventListener(
      "sayban:current-address-changed",
      onChanged as EventListener
    );
    return () => {
      alive = false;
      window.removeEventListener(
        "sayban:current-address-changed",
        onChanged as EventListener
      );
    };
  }, [router.asPath]);

  const origin = React.useMemo(() => {
    const lat = parseCoord(currentAddress?.latitude);
    const lng = parseCoord(currentAddress?.longitude);
    if (lat == null || lng == null) return null;
    return { lat, lng };
  }, [currentAddress]);

  const overrides = React.useMemo<PlasmicSubcategories__OverridesType>(
    () => ({
      header: {
        props: {
          className: headerStyles.headerWithAddress,
          children: (
            <CurrentAddressChip pageBase={pageBase} variant="header" enabled />
          )
        }
      },
      filter: {
        props: {
          nearbyEnabled: Boolean(origin)
        }
      },
      // The address picker used to float over the home landing. It belongs here,
      // where picking an address actually changes what the user sees (the
      // nearby sorting below). `children` is the Header's top-row slot.
      centers: {
        wrap: (node: React.ReactNode) => (
          <>
            <CentersTypeBanner />
            {node}
          </>
        ),
        render: (
          renderProps: React.ComponentProps<typeof ApiRequest>,
          DefaultApiRequest: typeof ApiRequest
        ) => {
          const {
            subcategory: _subcategory,
            category: _category,
            ...rest
          } = renderProps.params ?? {};

          const filterRaw = rest.filter;
          const filterObj =
            filterRaw &&
            typeof filterRaw === "object" &&
            !Array.isArray(filterRaw)
              ? (filterRaw as unknown as Record<string, unknown>)
              : {};
          const filters = filterObj as CentersFilters;
          const centerType = readCenterTypeFilter(filters);
          const nearbyWanted = readNearbyFilter(filters);
          const minRate = readRateFilter(filters);
          const availability = readAvailabilityFilter(filters);

          const params: CentersParams = subcategorySlug
            ? { ...rest, subcategory: subcategorySlug }
            : categorySlug
              ? { ...rest, category: categorySlug }
              : rest;

          const serializedFilter = serializeFiltersForApi(filters);
          if (Object.keys(serializedFilter).length > 0) {
            (params as Record<string, unknown>).filter = serializedFilter;
          } else {
            delete (params as Record<string, unknown>).filter;
          }

          if (centerType) {
            (params as Record<string, unknown>).center_type = centerType;
          }
          if (nearbyWanted && origin) {
            (params as Record<string, unknown>).lat = origin.lat;
            (params as Record<string, unknown>).lng = origin.lng;
            (params as Record<string, unknown>).sort =
              (params as Record<string, unknown>).sort || "nearby";
          }
          if (minRate > 0) {
            (params as Record<string, unknown>).min_rate = minRate;
          }
          if (availability && availability !== "any") {
            (params as Record<string, unknown>).availability = availability;
          }

          // Home «مراکز با امتیاز زیاد» → مشاهده همه primes this once.
          if (primedSort) {
            (params as Record<string, unknown>).sort = primedSort;
          }

          const listCacheKey = centersListCacheKey(params);

          return (
            <DefaultApiRequest
              key={listCacheKey}
              {...renderProps}
              params={params}
              shouldFetch={Boolean(filterSlug)}
              // Same pattern as Homepage `categories-full`: persist by a stable
              // auth-free key so leaving and re-entering the list paints instantly
              // and skips the network while the entry is fresh.
              cacheKey={listCacheKey}
              cacheTtlMs={CENTERS_LIST_CACHE_TTL_MS}
              onSuccess={(
                data: { result?: unknown[] } & Record<string, unknown>
              ) => {
                let next = data;
                if (centerType && data && Array.isArray(data.result)) {
                  const rows = data.result;
                  const anyTyped = rows.some(
                    row =>
                      row &&
                      typeof row === "object" &&
                      String(
                        (row as Record<string, unknown>).center_type ?? ""
                      ).trim() !== ""
                  );
                  if (anyTyped) {
                    next = {
                      ...data,
                      result: rows.filter(row =>
                        matchesCenterType(
                          row && typeof row === "object"
                            ? (row as Record<string, unknown>).center_type
                            : undefined,
                          centerType
                        )
                      )
                    };
                  }
                }
                if (
                  nearbyWanted &&
                  origin &&
                  next &&
                  Array.isArray(next.result)
                ) {
                  next = {
                    ...next,
                    result: sortCentersByNearby(next.result, origin)
                  };
                }
                if (next && Array.isArray(next.result)) {
                  let rows = next.result;
                  if (minRate > 0) {
                    rows = filterCentersByMinRate(rows, minRate);
                  }
                  if (availability && availability !== "any") {
                    rows = filterCentersByAvailability(rows, availability);
                  }
                  if (rows !== next.result) {
                    next = { ...next, result: rows };
                  }
                }
                renderProps.onSuccess?.(next);
              }}
            />
          );
        }
      }
    }),
    [categorySlug, filterSlug, origin, pageBase, primedSort, subcategorySlug]
  );

  return (
    <PlasmicSubcategories
      root={{ ref }}
      {...props}
      slug={filterSlug}
      overrides={overrides}
    />
  );
}

const Subcategories = React.forwardRef(Subcategories_);
export default Subcategories;
