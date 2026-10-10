import { useRouter } from "next/router";

/** True when the current route is the Panel app (`/panel…`). */
export function useIsPanelRoute(): boolean {
  const router = useRouter();
  const path = String(router?.asPath || router?.pathname || "");
  return (
    path === "/panel" ||
    path.startsWith("/panel/") ||
    path.startsWith("/panel?") ||
    path.startsWith("/panel/[")
  );
}
