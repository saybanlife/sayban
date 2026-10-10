import * as React from "react";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";

/**
 * Controls the blocking full-page loader rendered by the Fragment global
 * context. Use it for requests the user must not interrupt; for ordinary
 * submits prefer a button-level `loading` state instead.
 *
 * Prefer `useSubmitAction`, which pairs this with a double-submit guard and
 * releases the overlay in a `finally`.
 */
export function usePageLoading() {
  const globalActions = useGlobalActions();

  const show = React.useCallback(
    (message?: string) => {
      globalActions?.["Fragment.showPageLoading"]?.(message);
    },
    [globalActions]
  );

  const hide = React.useCallback(() => {
    globalActions?.["Fragment.hidePageLoading"]?.();
  }, [globalActions]);

  return { show, hide };
}

export default usePageLoading;
