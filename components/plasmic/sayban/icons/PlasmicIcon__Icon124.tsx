/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon124IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon124Icon(props: Icon124IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      style={{
        fill: "currentcolor",

        ...(style || {})
      }}
      className={classNames("plasmic-default__svg", className)}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path d={"m6 18 8.5-6L6 6zm9-12h2v12h-2z"}></path>
    </svg>
  );
}

export default Icon124Icon;
/* prettier-ignore-end */
