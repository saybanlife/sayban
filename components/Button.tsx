import * as React from "react";
import {
  PlasmicButton,
  DefaultButtonProps
} from "./plasmic/sayban/PlasmicButton";

export interface ButtonProps extends DefaultButtonProps {}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return Boolean(
    value && typeof value === "object" && "then" in value && typeof (value as PromiseLike<unknown>).then === "function"
  );
}

/**
 * Auto-sets `loading` (which also disables the button) while an async
 * `onClick` is in flight, so panel/public actions cannot double-submit.
 * Explicit `loading={true|false}` from the parent still wins when already true.
 * A stuck promise cannot leave the button dead forever — release after 30s.
 */
const AUTO_LOADING_MAX_MS = 30_000;

function Button(props: ButtonProps) {
  const { onClick, loading: loadingProp, ...rest } = props;
  const [autoLoading, setAutoLoading] = React.useState(false);
  const inFlightRef = React.useRef(false);
  const mountedRef = React.useRef(true);
  const releaseTimerRef = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(
    () => () => {
      mountedRef.current = false;
      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    },
    []
  );

  const loading = Boolean(loadingProp) || autoLoading;

  const clearInFlight = React.useCallback(() => {
    inFlightRef.current = false;
    if (releaseTimerRef.current) {
      clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = undefined;
    }
    if (mountedRef.current) setAutoLoading(false);
  }, []);

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (inFlightRef.current || loadingProp) {
        event.preventDefault();
        return;
      }
      const result = onClick?.(event as never);
      if (!isThenable(result)) return;
      inFlightRef.current = true;
      setAutoLoading(true);
      releaseTimerRef.current = setTimeout(clearInFlight, AUTO_LOADING_MAX_MS);
      Promise.resolve(result).finally(clearInFlight);
    },
    [clearInFlight, loadingProp, onClick]
  );

  return (
    <PlasmicButton
      {...rest}
      loading={loading}
      onClick={handleClick as never}
    />
  );
}

export default Button;
