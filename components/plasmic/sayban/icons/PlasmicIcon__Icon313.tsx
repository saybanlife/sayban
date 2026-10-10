/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon313IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon313Icon(props: Icon313IconProps) {
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
        strokeWidth={"2"}
        d={
          "m3.5 13-.204-.952C2.629 8.935 5.002 6 8.185 6H19m0 0-3 3m3-3-3-3m4.5 8 .204.952C21.371 15.065 18.998 18 15.815 18H5m0 0 3-3m-3 3 3 3"
        }
      ></path>
    </svg>
  );
}

export default Icon313Icon;
/* prettier-ignore-end */
