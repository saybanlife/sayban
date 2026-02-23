/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon74IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon74Icon(props: Icon74IconProps) {
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

      <g stroke={"currentColor"} strokeWidth={"1.5"}>
        <circle cx={"12"} cy={"9"} r={"3"}></circle>

        <circle cx={"12"} cy={"12"} r={"10"}></circle>

        <path
          strokeLinecap={"round"}
          d={"M17.97 20c-.16-2.892-1.045-5-5.97-5s-5.81 2.108-5.97 5"}
        ></path>
      </g>
    </svg>
  );
}

export default Icon74Icon;
/* prettier-ignore-end */
