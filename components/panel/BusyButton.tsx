import * as React from "react";

type BusyButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  busyLabel?: string;
};

/**
 * Native submit/action button used across center-panel forms. While `busy`,
 * the control is disabled and shows a short progress label.
 */
export function BusyButton({
  busy = false,
  busyLabel = "در حال انجام...",
  children,
  disabled,
  className,
  ...rest
}: BusyButtonProps) {
  return (
    <button
      {...rest}
      className={className}
      disabled={Boolean(disabled || busy)}
      aria-busy={busy || undefined}
    >
      {busy ? busyLabel : children}
    </button>
  );
}

export default BusyButton;
