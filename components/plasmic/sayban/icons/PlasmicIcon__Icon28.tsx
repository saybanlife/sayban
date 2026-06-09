/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon28IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon28Icon(props: Icon28IconProps) {
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

      <radialGradient
        id={"a"}
        cx={".66"}
        cy={".313"}
        fx={".66"}
        fy={".313"}
        gradientTransform={"scale(1.5)"}
      >
        <stop offset={"0"} stopColor={"#FF156D"}></stop>

        <stop offset={".3"} stopColor={"#FF156D"} stopOpacity={".9"}></stop>

        <stop offset={".6"} stopColor={"#FF156D"} stopOpacity={".6"}></stop>

        <stop offset={".8"} stopColor={"#FF156D"} stopOpacity={".3"}></stop>

        <stop offset={"1"} stopColor={"#FF156D"} stopOpacity={"0"}></stop>
      </radialGradient>

      <circle
        cx={"100"}
        cy={"100"}
        r={"70"}
        fill={"none"}
        stroke={"url(#a)"}
        strokeDasharray={"200 1000"}
        strokeDashoffset={"0"}
        strokeLinecap={"round"}
        strokeWidth={"15"}
        transformOrigin={"center"}
      >
        <animateTransform
          attributeName={"transform"}
          calcMode={"spline"}
          dur={"2"}
          keySplines={"0 0 1 1"}
          keyTimes={"0;1"}
          repeatCount={"indefinite"}
          type={"rotate"}
          values={"360;0"}
        ></animateTransform>
      </circle>

      <circle
        cx={"100"}
        cy={"100"}
        r={"70"}
        fill={"none"}
        stroke={"#FF156D"}
        strokeLinecap={"round"}
        strokeWidth={"15"}
        opacity={".2"}
        transformOrigin={"center"}
      ></circle>
    </svg>
  );
}

export default Icon28Icon;
/* prettier-ignore-end */
