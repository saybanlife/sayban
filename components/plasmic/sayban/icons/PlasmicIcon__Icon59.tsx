/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon59IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon59Icon(props: Icon59IconProps) {
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
        fill={"currentColor"}
        d={
          "M17.54 8.81a2.96 2.96 0 1 0 0-5.92 2.96 2.96 0 0 0 0 5.92m-11.08 0a2.96 2.96 0 1 0 0-5.92 2.96 2.96 0 0 0 0 5.92m11.08 12.3a2.96 2.96 0 1 0 0-5.92 2.96 2.96 0 0 0 0 5.92m-11.08 0a2.96 2.96 0 1 0 0-5.92 2.96 2.96 0 0 0 0 5.92"
        }
      ></path>
    </svg>
  );
}

export default Icon59Icon;
/* prettier-ignore-end */
