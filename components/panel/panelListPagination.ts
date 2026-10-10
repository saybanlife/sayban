export const PANEL_LIST_PAGE_SIZE = 10;

export type PanelListPagination = {
  page: number;
  limit: number;
  count?: number;
  total?: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
};

export function normalizePanelPagination(
  raw: unknown,
  fallbackPage = 1,
  fallbackLimit = PANEL_LIST_PAGE_SIZE
): PanelListPagination {
  const data =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const page = Math.max(Number(data.page) || fallbackPage, 1);
  const limit = Math.max(Number(data.limit) || fallbackLimit, 1);
  const total = Math.max(Number(data.total) || 0, 0);
  const totalPages = Math.max(
    Number(data.totalPages) || Math.ceil(total / limit) || 1,
    1
  );
  return {
    page: Math.min(page, totalPages),
    limit,
    count: Number(data.count) || undefined,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  };
}

export function readPaginationFromApiPayload(
  payload: unknown
): PanelListPagination | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  const pagination = data.pagination ?? (data.data as any)?.pagination;
  if (!pagination || typeof pagination !== "object") return null;
  return normalizePanelPagination(pagination);
}
