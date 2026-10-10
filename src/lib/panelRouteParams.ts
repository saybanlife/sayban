/**
 * Catch-all `/panel/[[...page]]` reuses one Next.js page. Plasmic reads
 * `$ctx.params.page[0]`, which breaks when Next supplies a string (so
 * `"users"[0] === "u"`) or when `PageParamsProvider` is keyed off `pathname`
 * (always `/panel/[[...page]]`) while `asPath` has already changed.
 */

export type PanelQueryPage = string | string[] | undefined;

/** `trailingSlash: true` — catch-all nav without the slash can update the bar and skip React. */
export function panelAppHref(path: string): string {
  const raw = String(path || "").trim() || "/panel/";
  const match = raw.match(/^([^?#]*)(.*)$/);
  const pathname = match?.[1] || "/panel/";
  const suffix = match?.[2] || "";
  const withSlash = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return `${withSlash}${suffix}`;
}

export function readPanelHref(
  asPath: string,
  windowPath?: string,
  windowSearch?: string
): string {
  if (windowPath && windowPath.startsWith("/panel")) {
    return `${windowPath}${windowSearch || ""}`;
  }
  return asPath;
}

export function normalizeCatchAllParam(value: PanelQueryPage): string[] {
  if (Array.isArray(value)) {
    return value.map(part => String(part).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

/** Pathname segments after `/panel`, ignoring query/hash and trailing slashes. */
export function panelPageSegmentsFromAsPath(asPath: string): string[] {
  const path = String(asPath || "").split(/[?#]/, 1)[0];
  const parts = path.split("/").filter(Boolean);
  if (parts[0] !== "panel") return [];
  return parts.slice(1).map(part => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });
}

/**
 * Prefer `asPath` — it updates with the URL during client navigation, while
 * `query.page` can lag or stay the previous catch-all value.
 */
export function panelPageSegmentsFromLocation(
  queryPage: PanelQueryPage,
  asPath: string
): string[] {
  const fromPath = panelPageSegmentsFromAsPath(asPath);
  if (fromPath.length > 0) return fromPath;
  return normalizeCatchAllParam(queryPage);
}

export function firstPanelPageSegment(
  queryPage: PanelQueryPage,
  asPath = ""
): string {
  return panelPageSegmentsFromLocation(queryPage, asPath)[0] || "";
}

export function panelParamsFromRouter(
  query: Record<string, string | string[] | undefined>,
  asPath: string
): Record<string, string | string[] | undefined> {
  return {
    ...query,
    page: panelPageSegmentsFromLocation(query.page, asPath)
  };
}

/**
 * Same mapping PlasmicPanel uses for Main's `page` prop (`center-12` →
 * `center`, pass-through for `support` / `center_info-12`).
 */
export function mainPageFromPanelSegment(segment: string): string {
  const page = String(segment ?? "");
  if (page.startsWith("center-")) return "center";
  if (page.startsWith("service-")) return "service";
  if (page.startsWith("user-")) return "user";
  return page;
}
