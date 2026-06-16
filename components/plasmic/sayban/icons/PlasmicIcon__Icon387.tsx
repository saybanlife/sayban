/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon387IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon387Icon(props: Icon387IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      xmlnsXlink={"http://www.w3.org/1999/xlink"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        stroke={"#292D32"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeMiterlimit={"10"}
        strokeWidth={"1.5"}
        d={
          "M8 2v3m8-3v3M3.5 9.09h17M12 22H8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5V12"
        }
      ></path>

      <path
        stroke={"#292D32"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"2"}
        d={"M11.995 13.7h.009m-3.709 0h.01m-.01 3h.01"}
      ></path>

      <g
        stroke={"#292D32"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeMiterlimit={"10"}
        strokeWidth={"1.5"}
        clipPath={"url(#a)"}
      >
        <path
          d={"M15.342 15.935h5.19c.622 0 1.125.503 1.125 1.125v1.245"}
        ></path>

        <path
          d={
            "m16.527 14.75-1.185 1.185 1.185 1.185m5.13 3.945h-5.19a1.123 1.123 0 0 1-1.125-1.125v-1.245"
          }
        ></path>

        <path d={"m20.473 22.25 1.185-1.185-1.185-1.185"}></path>
      </g>

      <defs>
        <clipPath id={"a"}>
          <path fill={"#fff"} d={"M14 14h9v9h-9z"}></path>
        </clipPath>
      </defs>
    </svg>
  );
}

export default Icon387Icon;
/* prettier-ignore-end */
