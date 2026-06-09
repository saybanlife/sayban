/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon54IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon54Icon(props: Icon54IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeWidth={"1.5"}
        d={"M3 7h18M6 12h12m-8 5h4"}
      ></path>
    </svg>
  );
}

export default Icon54Icon;
/* prettier-ignore-end */
