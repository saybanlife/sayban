export type HomeSliderItem = {
  id: number;
  image_url: string;
  action?: string | null;
  is_active?: boolean | number;
  sort_order?: number;
};

export type HomeSliderForm = {
  image_url: string;
  action: string;
  is_active: boolean;
  sort_order: number;
};

export function normalizeHomeSliders(raw: unknown): HomeSliderItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(item => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const id = Number(row.id);
      const image_url = String(row.image_url ?? row.image ?? "").trim();
      if (!id || !image_url) return null;
      const isActiveRaw = row.is_active;
      const is_active =
        isActiveRaw == null
          ? undefined
          : Number(isActiveRaw) === 1 || isActiveRaw === true;

      return {
        id,
        image_url,
        action: row.action != null ? String(row.action) : null,
        is_active,
        sort_order: Number(row.sort_order ?? 0)
      } satisfies HomeSliderItem;
    })
    .filter(Boolean) as HomeSliderItem[];
}

export function runHomeSliderAction(
  action: string | null | undefined,
  navigate: (path: string) => void
) {
  const target = (action ?? "").trim();
  if (!target) return;
  if (/^https?:\/\//i.test(target)) {
    window.open(target, "_blank", "noopener,noreferrer");
    return;
  }
  navigate(target.startsWith("/") ? target : `/${target}`);
}
