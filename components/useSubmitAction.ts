import * as React from "react";
import { usePageLoading } from "./usePageLoading";

export type RunOptions = {
  /**
   * Cover the whole page while the action runs. Use for requests the user must
   * not interrupt (starting a chat, verifying an OTP, booking, payment).
   */
  blocking?: boolean;
  /** Overlay message; defaults to «در حال بارگذاری...». */
  message?: string;
};

/**
 * Guards a server action against double-submits and exposes the in-flight flag
 * for the button's `loading` prop.
 *
 * The guard is a ref rather than the state value because `setState` is async:
 * two clicks in the same tick would both see `inFlight === false` and fire two
 * requests. Repeat calls while busy resolve to `undefined` instead of throwing,
 * so callers can ignore the result.
 *
 * ```tsx
 * const { inFlight, run } = useSubmitAction();
 * <Button loading={inFlight} onClick={() => run(save)} />
 * ```
 */
export function useSubmitAction() {
  const [inFlight, setInFlight] = React.useState(false);
  const inFlightRef = React.useRef(false);
  const mountedRef = React.useRef(true);
  const { show, hide } = usePageLoading();

  React.useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  const run = React.useCallback(
    async <T>(
      action: () => Promise<T>,
      options?: RunOptions
    ): Promise<T | undefined> => {
      if (inFlightRef.current) return undefined;
      inFlightRef.current = true;
      setInFlight(true);
      if (options?.blocking) show(options.message);

      try {
        return await action();
      } finally {
        if (options?.blocking) hide();
        inFlightRef.current = false;
        // The action may have navigated away and unmounted this component.
        if (mountedRef.current) setInFlight(false);
      }
    },
    [show, hide]
  );

  return { inFlight, run };
}

export default useSubmitAction;
