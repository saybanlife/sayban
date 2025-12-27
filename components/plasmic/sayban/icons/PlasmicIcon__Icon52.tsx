/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon52IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon52Icon(props: Icon52IconProps) {
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
        strokeLinejoin={"round"}
        strokeMiterlimit={"10"}
        strokeWidth={"1.5"}
        d={
          "M5 10h2q3 0 3-3V5q0-3-3-3H5Q2 2 2 5v2q0 3 3 3m12 0h2q3 0 3-3V5q0-3-3-3h-2q-3 0-3 3v2q0 3 3 3m0 12h2q3 0 3-3v-2q0-3-3-3h-2q-3 0-3 3v2q0 3 3 3M5 22h2q3 0 3-3v-2q0-3-3-3H5q-3 0-3 3v2q0 3 3 3"
        }
      ></path>
    </svg>
  );
}

export default Icon52Icon;
/* prettier-ignore-end */
