import * as React from "react";
import {
  PlasmicButton2,
  DefaultButton2Props
} from "./plasmic/sayban/PlasmicButton2";

import {
  ButtonRef,
  HtmlAnchorOnlyProps,
  HtmlButtonOnlyProps
} from "@plasmicapp/react-web";

export interface Button2Props extends DefaultButton2Props {}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      "then" in value &&
      typeof (value as PromiseLike<unknown>).then === "function"
  );
}

const AUTO_LOADING_MAX_MS = 30_000;

function Button2_(props: Button2Props, ref: ButtonRef) {
  const { onClick, loading: loadingProp, isDisabled, disabled, ...rest } =
    props;
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
  const blocked = Boolean(isDisabled || disabled || loading);

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
      if (inFlightRef.current || blocked) {
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
    [blocked, clearInFlight, onClick]
  );

  const { plasmicProps } = PlasmicButton2.useBehavior<Button2Props>(
    {
      ...rest,
      loading,
      isDisabled: blocked || undefined,
      disabled: blocked || undefined,
      onClick: handleClick as never
    },
    ref
  );
  return <PlasmicButton2 {...plasmicProps} />;
}

export type ButtonComponentType = {
  (
    props: Omit<Button2Props, HtmlAnchorOnlyProps> & {
      ref?: React.Ref<HTMLButtonElement>;
    }
  ): React.ReactElement;
  (
    props: Omit<Button2Props, HtmlButtonOnlyProps> & {
      ref?: React.Ref<HTMLAnchorElement>;
    }
  ): React.ReactElement;
};
const Button2 = React.forwardRef(Button2_) as any as ButtonComponentType;

export default Object.assign(Button2, { __plumeType: "button" });
