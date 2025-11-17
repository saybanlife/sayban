/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon7IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon7Icon(props: Icon7IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      data-name={"Layer 1"}
      viewBox={"0 0 211.06 75.87"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        fill={"none"}
        stroke={"currentColor"}
        strokeMiterlimit={"10"}
        strokeWidth={"10"}
        d={
          "M211.06 5h-10.74c-14.8 0-27.9 9.28-33.1 23.14-9.37 24.97-33.46 42.74-61.7 42.74s-52.33-17.77-61.7-42.74C38.64 14.28 25.53 5 10.74 5H0"
        }
      ></path>
    </svg>
  );
}

export default Icon7Icon;
/* prettier-ignore-end */
