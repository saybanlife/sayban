import * as React from "react";
import plasmicStyles from "./plasmic/sayban/PlasmicHome.module.css";
import styles from "./HomeCategoriesPager.module.css";
import Icon33Icon from "./plasmic/sayban/icons/PlasmicIcon__Icon33";
import Icon34Icon from "./plasmic/sayban/icons/PlasmicIcon__Icon34";

const PAGE_SIZE = 3;

type CategoryItem = {
  id?: string | number;
  category_id?: string | number;
  slug?: string;
  name?: string;
  title?: string;
  description?: string;
  subtitle?: string;
  icon?: string;
  image?: string;
  image_url?: string;
};

type HomeCategoriesPagerProps = {
  categories?: unknown;
  search?: boolean;
  onItemClick?: (item: any, event: any) => void | Promise<void>;
  className?: string;
};

function asCategory(item: unknown): CategoryItem {
  if (!item || typeof item !== "object") return {};
  return item as CategoryItem;
}

function itemKey(item: CategoryItem, page: number, index: number) {
  return item.id ?? item.category_id ?? item.slug ?? `${page}-${index}`;
}

function itemTitle(item: CategoryItem) {
  return String(item.name ?? item.title ?? "").trim();
}

function itemSubtitle(item: CategoryItem) {
  return String(item.description ?? item.subtitle ?? "").trim();
}

function itemImage(item: CategoryItem) {
  const raw = item.icon ?? item.image ?? item.image_url ?? "";
  if (typeof raw === "string") return raw.trim();
  if (raw && typeof raw === "object" && "src" in (raw as object)) {
    return String((raw as { src?: string }).src ?? "").trim();
  }
  return "";
}

export function HomeCategoriesPager({
  categories,
  onItemClick,
  className
}: HomeCategoriesPagerProps) {
  const items = React.useMemo(
    () => (Array.isArray(categories) ? categories.map(asCategory) : []),
    [categories]
  );
  const [page, setPage] = React.useState(0);
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));

  React.useEffect(() => {
    setPage(0);
  }, [items.length]);

  React.useEffect(() => {
    setPage(current => Math.min(current, Math.max(0, pageCount - 1)));
  }, [pageCount]);

  const safePage = Math.min(page, pageCount - 1);
  const visible = items.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  );

  const canPrev = safePage > 0;
  const canNext = safePage < pageCount - 1;
  const showArrows = items.length > PAGE_SIZE;

  return (
    <div
      className={[
        "all",
        plasmicStyles.freeBox___9Bjvc,
        styles.pager,
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showArrows ? (
        <button
          type="button"
          className={[
            styles.arrowBtn,
            styles.arrowPrev,
            !canPrev ? styles.arrowDisabled : ""
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label="گروه قبلی"
          disabled={!canPrev}
          onClick={() => canPrev && setPage(current => Math.max(0, current - 1))}
        >
          <Icon33Icon className={styles.arrowIcon} role="img" />
        </button>
      ) : null}

      {showArrows ? (
        <button
          type="button"
          className={[
            styles.arrowBtn,
            styles.arrowNext,
            !canNext ? styles.arrowDisabled : ""
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label="گروه بعدی"
          disabled={!canNext}
          onClick={() =>
            canNext &&
            setPage(current => Math.min(pageCount - 1, current + 1))
          }
        >
          <Icon34Icon className={styles.arrowIcon} role="img" />
        </button>
      ) : null}

      <div
        className={styles.track}
        style={{
          gridTemplateColumns: `repeat(${Math.max(visible.length, 1)}, minmax(0, 1fr))`
        }}
      >
        {visible.map((item, index) => {
          const title = itemTitle(item);
          const subtitle = itemSubtitle(item);
          const image = itemImage(item);

          return (
            <button
              key={itemKey(item, safePage, index)}
              type="button"
              className={styles.card}
              onClick={event => onItemClick?.(item, event)}
            >
              <div className={styles.cardInner}>
                <div className={styles.imageWrap}>
                  {image ? (
                    <img
                      alt=""
                      className={styles.image}
                      loading="lazy"
                      src={image}
                    />
                  ) : (
                    <div className={styles.imageFallback} aria-hidden="true" />
                  )}
                </div>
                <div className={styles.title}>{title || "—"}</div>
                {subtitle ? (
                  <div className={styles.subtitle}>{subtitle}</div>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default HomeCategoriesPager;
