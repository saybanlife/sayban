/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon62IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon62Icon(props: Icon62IconProps) {
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
          "M22 6.5h-6m-10 0H2m8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m12 7.5h-4m-10 0H2M14 21a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7"
        }
      ></path>
    </svg>
  );
}

export default Icon62Icon;
/* prettier-ignore-end */
