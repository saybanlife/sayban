/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon344IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon344Icon(props: Icon344IconProps) {
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
          "M8 2v3m8-3v3M3.5 9.09h17M18 23a4 4 0 1 0 0-8 4 4 0 0 0 0 8m1.07-2.89L16.95 18m2.1.02-2.12 2.12"
        }
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeMiterlimit={"10"}
        strokeWidth={"1.5"}
        d={
          "M21 8.5v7.86c-.73-.83-1.8-1.36-3-1.36-2.21 0-4 1.79-4 4 0 .75.21 1.46.58 2.06.21.36.48.68.79.94H8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5"
        }
      ></path>

      <path
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"2"}
        d={"M11.995 13.7h.009m-3.709 0h.01m-.01 3h.01"}
      ></path>
    </svg>
  );
}

export default Icon344Icon;
/* prettier-ignore-end */
