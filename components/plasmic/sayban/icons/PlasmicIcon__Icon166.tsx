/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon166IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon166Icon(props: Icon166IconProps) {
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
        fill={"#fff"}
      ></rect>

      <rect
        x={".5"}
        y={".5"}
        width={"23"}
        height={"23"}
        rx={"11.5"}
        stroke={"#C7C7C7"}
      ></rect>
    </svg>
  );
}

export default Icon166Icon;
/* prettier-ignore-end */
