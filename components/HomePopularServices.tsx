import * as React from "react";
import styles from "./HomePopularServices.module.css";
import { getServiceIcon } from "./centerPage/serviceIcons";

export type HomeCategoryLike = {
  id?: string | number;
  slug?: string;
  name?: string;
  title?: string;
  icon?: string;
  image?: string;
  image_url?: string;
  subcategories?: unknown;
};

export type HomeSubcategoryLike = {
  id?: string | number;
  slug?: string;
  name?: string;
  title?: string;
  icon?: string;
  image?: string;
  image_url?: string;
  category_id?: string | number;
  parentSlug?: string;
  parentName?: string;
  parentIcon?: string;
};

type HomePopularServicesProps = {
  categories?: unknown;
  onSelect?: (item: HomeSubcategoryLike) => void;
  className?: string;
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

function readImage(item: Record<string, unknown>): string {
  const raw = item.icon ?? item.image ?? item.image_url ?? "";
  if (typeof raw === "string") return raw.trim();
  if (raw && typeof raw === "object" && "src" in raw) {
    return readString((raw as { src?: unknown }).src);
  }
  return "";
}

/**
 * Flatten nested category.subcategories from `/categories/full`
 * into a unique list keyed by subcategory slug.
 */
export function flattenHomeSubcategories(
  categories: unknown
): HomeSubcategoryLike[] {
  if (!Array.isArray(categories)) return [];

  const seen = new Set<string>();
  const out: HomeSubcategoryLike[] = [];

  for (const rawCat of categories) {
    const cat = asObject(rawCat);
    const parentSlug = readString(cat.slug);
    const parentName = readString(cat.name ?? cat.title);
    const parentIcon = readImage(cat);
    const subs = Array.isArray(cat.subcategories) ? cat.subcategories : [];

    for (const rawSub of subs) {
      const sub = asObject(rawSub);
      const slug = readString(sub.slug);
      const name = readString(sub.name ?? sub.title);
      if (!slug && !name) continue;

      const key = slug || `${parentSlug}:${name}`;
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        id: (sub.id as string | number | undefined) ?? key,
        slug: slug || undefined,
        name: name || slug,
        icon: readImage(sub) || undefined,
        parentSlug: parentSlug || undefined,
        parentName: parentName || undefined,
        parentIcon: parentIcon || undefined,
        category_id:
          (sub.category_id as string | number | undefined) ??
          (cat.id as string | number | undefined)
      });
    }
  }

  return out;
}

/**
 * Resolve category/subcategory object for centers header from route slugs.
 */
export function resolveCentersFilterLabel(
  categories: unknown,
  slugParts: string[]
): HomeSubcategoryLike | HomeCategoryLike | undefined {
  if (!Array.isArray(categories) || !slugParts.length) return undefined;

  const categorySlug = slugParts[0] || "";
  const subcategorySlug = slugParts[1] || "";
  const cats = categories.map(asObject);
  const parent = cats.find(cat => readString(cat.slug) === categorySlug);
  if (!parent) return undefined;

  if (!subcategorySlug) {
    return {
      id: parent.id as string | number | undefined,
      slug: categorySlug,
      name: readString(parent.name ?? parent.title) || categorySlug,
      icon: readImage(parent) || undefined
    };
  }

  const subs = Array.isArray(parent.subcategories) ? parent.subcategories : [];
  const sub = subs.map(asObject).find(item => readString(item.slug) === subcategorySlug);
  if (!sub) {
    return {
      slug: subcategorySlug,
      name: subcategorySlug,
      parentSlug: categorySlug
    };
  }

  return {
    id: sub.id as string | number | undefined,
    slug: subcategorySlug,
    name: readString(sub.name ?? sub.title) || subcategorySlug,
    icon: readImage(sub) || undefined,
    parentSlug: categorySlug,
    parentName: readString(parent.name ?? parent.title) || undefined
  };
}

/**
 * Build the existing Homepage deep-link for a subcategory:
 * `/{page}/{parentSlug}/{subSlug}` → Subcategories applies `subcategory` filter.
 * Fallback: `/{page}/{slug}` when parent is unknown (category-style single segment).
 */
export function buildCentersPath(
  pageBase: string,
  item: HomeSubcategoryLike
): string {
  const page = pageBase || "home";
  const subSlug = readString(item.slug);
  const parentSlug = readString(item.parentSlug);

  if (parentSlug && subSlug) {
    return `/${page}/${encodeURIComponent(parentSlug)}/${encodeURIComponent(subSlug)}`;
  }
  if (subSlug) {
    return `/${page}/${encodeURIComponent(subSlug)}`;
  }
  if (parentSlug) {
    return `/${page}/${encodeURIComponent(parentSlug)}`;
  }
  return `/${page}/`;
}

export function HomePopularServices({
  categories,
  onSelect,
  className
}: HomePopularServicesProps) {
  const items = React.useMemo(
    () => flattenHomeSubcategories(categories),
    [categories]
  );

  if (!items.length) return null;

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      role="list"
      aria-label="پرکاربردترین خدمات"
    >
      <div className={styles.scroller}>
        {items.map((item, index) => {
          const title = item.name || item.slug || "—";
          const image = item.icon || item.parentIcon || "";
          const FallbackIcon = getServiceIcon({ name: title }, index);

          return (
            <button
              key={String(item.id ?? item.slug ?? index)}
              type="button"
              role="listitem"
              className={styles.card}
              aria-label={title}
              onClick={() => onSelect?.(item)}
            >
              <span className={styles.iconBox}>
                {image ? (
                  <img
                    alt=""
                    className={styles.iconImg}
                    loading="lazy"
                    src={image}
                  />
                ) : (
                  <FallbackIcon
                    className={styles.iconSvg}
                    role="img"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className={styles.label}>{title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default HomePopularServices;
