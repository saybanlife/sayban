/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon126IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon126Icon(props: Icon126IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      xmlSpace={"preserve"}
      fill={"currentColor"}
      fillRule={"evenodd"}
      strokeLinejoin={"round"}
      strokeMiterlimit={"2"}
      clipRule={"evenodd"}
      version={"1.1"}
      viewBox={"0 0 32 32"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M10 1a5 5 0 0 0-3.536 1.464A5 5 0 0 0 5 6v20c0 1.326.527 2.598 1.464 3.536A5 5 0 0 0 10 31h12a5 5 0 0 0 3.536-1.464A5 5 0 0 0 27 26V6a5 5 0 0 0-1.464-3.536A5 5 0 0 0 22 1v3a5 5 0 0 1-1.464 3.536A5 5 0 0 1 17 9h-2a5 5 0 0 1-3.536-1.464A5 5 0 0 1 10 4zm1 25h10a1 1 0 0 0 0-2H11a1 1 0 0 0 0 2m0-6h10a1 1 0 0 0 0-2H11a1 1 0 0 0 0 2m0-6h10a1 1 0 0 0 0-2H11a1 1 0 0 0 0 2m9-13v3c0 .796-.316 1.559-.879 2.121A3 3 0 0 1 17 7h-2a3 3 0 0 1-2.121-.879A3 3 0 0 1 12 4V1z"
        }
      ></path>
    </svg>
  );
}

export default Icon126Icon;
/* prettier-ignore-end */
