import * as React from "react";

export type CenterFavoriteContextValue = {
  /** Numeric centers.id used by favorites APIs. */
  centerId?: number | null;
  token?: string | null;
};

export const CenterFavoriteContext =
  React.createContext<CenterFavoriteContextValue>({});

export function useCenterFavoriteContext() {
  return React.useContext(CenterFavoriteContext);
}

/** Accept only a real centers.id (positive integer). */
export function parseNumericCenterId(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 && Number.isInteger(raw)
      ? raw
      : null;
  }
  const text = String(raw).trim();
  if (!/^\d+$/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) && n > 0 ? n : null;
}
