/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon125IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon125Icon(props: Icon125IconProps) {
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

      <path d={"M6 6h2v12H6zm3.5 6 8.5 6V6z"}></path>
    </svg>
  );
}

export default Icon125Icon;
/* prettier-ignore-end */
