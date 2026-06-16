/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon167IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon167Icon(props: Icon167IconProps) {
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

      <rect
        x={".5"}
        y={".5"}
        width={"23"}
        height={"23"}
        rx={"11.5"}
        fill={"#8254C6"}
      ></rect>

      <rect
        x={".5"}
        y={".5"}
        width={"23"}
        height={"23"}
        rx={"11.5"}
        stroke={"#8254C6"}
      ></rect>

      <mask
        id={"90208oxBmQvma"}
        style={{
          maskType: 'alpha"'
        }}
        maskUnits={"userSpaceOnUse"}
        x={"0"}
        y={"0"}
        width={"24"}
        height={"24"}
      >
        <path fill={"#D9D9D9"} d={"M0 0h24v24H0z"}></path>
      </mask>

      <g mask={"url(#90208oxBmQvma)"}>
        <path
          d={
            "M10 13.6l5.9-5.9a.948.948 0 01.7-.275c.283 0 .516.091.7.275a.948.948 0 01.275.7.948.948 0 01-.275.7l-6.6 6.6c-.2.2-.433.3-.7.3a.96.96 0 01-.7-.3l-2.6-2.6a.948.948 0 01-.275-.7c0-.284.091-.517.275-.7a.948.948 0 01.7-.275c.283 0 .516.091.7.275l1.9 1.9z"
          }
          fill={"#fff"}
        ></path>
      </g>
    </svg>
  );
}

export default Icon167Icon;
/* prettier-ignore-end */
