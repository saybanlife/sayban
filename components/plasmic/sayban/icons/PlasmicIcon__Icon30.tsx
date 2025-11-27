/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon30IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon30Icon(props: Icon30IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      viewBox={"0 0 200 200"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <circle
        cx={"40"}
        cy={"100"}
        r={"15"}
        fill={"currentColor"}
        stroke={"currentColor"}
        strokeWidth={"15"}
      >
        <animate
          attributeName={"opacity"}
          begin={"-.4"}
          calcMode={"spline"}
          dur={"5"}
          keySplines={".5 0 .5 1;.5 0 .5 1"}
          repeatCount={"indefinite"}
          values={"1;0;1;"}
        ></animate>
      </circle>

      <circle
        cx={"100"}
        cy={"100"}
        r={"15"}
        fill={"currentColor"}
        stroke={"currentColor"}
        strokeWidth={"15"}
      >
        <animate
          attributeName={"opacity"}
          begin={"-.2"}
          calcMode={"spline"}
          dur={"5"}
          keySplines={".5 0 .5 1;.5 0 .5 1"}
          repeatCount={"indefinite"}
          values={"1;0;1;"}
        ></animate>
      </circle>

      <circle
        cx={"160"}
        cy={"100"}
        r={"15"}
        fill={"currentColor"}
        stroke={"currentColor"}
        strokeWidth={"15"}
      >
        <animate
          attributeName={"opacity"}
          begin={"0"}
          calcMode={"spline"}
          dur={"5"}
          keySplines={".5 0 .5 1;.5 0 .5 1"}
          repeatCount={"indefinite"}
          values={"1;0;1;"}
        ></animate>
      </circle>
    </svg>
  );
}

export default Icon30Icon;
/* prettier-ignore-end */
