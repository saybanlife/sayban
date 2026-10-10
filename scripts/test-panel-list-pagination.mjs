import assert from "node:assert/strict";

function normalizePanelPagination(raw, fallbackPage = 1, fallbackLimit = 10) {
  const data = raw && typeof raw === "object" ? raw : {};
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
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1
  };
}

function readPaginationFromApiPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  const pagination = payload.pagination ?? payload.data?.pagination;
  if (!pagination || typeof pagination !== "object") return null;
  return normalizePanelPagination(pagination);
}

const normalized = normalizePanelPagination({
  page: 2,
  limit: 10,
  total: 34,
  totalPages: 4
});
assert.equal(normalized.page, 2);
assert.equal(normalized.totalPages, 4);
assert.equal(normalized.hasNextPage, true);

assert.equal(
  readPaginationFromApiPayload({
    success: true,
    pagination: { page: 1, limit: 10, total: 0, totalPages: 1 }
  })?.totalPages,
  1
);
assert.equal(readPaginationFromApiPayload({ success: true }), null);

console.log("panelListPagination ok");
