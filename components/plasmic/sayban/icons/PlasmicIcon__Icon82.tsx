/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon82IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon82Icon(props: Icon82IconProps) {
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
        strokeWidth={"1.5"}
        d={
          "M12 17v-.007m0-2.136c0-3.214 3-2.5 3-5C15 8.28 13.657 7 12 7c-1.343 0-2.48.84-2.863 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0"
        }
      ></path>
    </svg>
  );
}

export default Icon82Icon;
/* prettier-ignore-end */
