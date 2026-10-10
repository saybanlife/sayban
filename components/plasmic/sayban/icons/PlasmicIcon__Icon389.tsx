/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon389IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon389Icon(props: Icon389IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"currentColor"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M17 8c-9 2-11.1 8.17-13.18 13.34L5.71 22l1-2.3A4.49 4.49 0 008 20c11 0 14-17 14-17-1 2-8 2.25-13 3.25S2 11.5 2 13.5a6.22 6.22 0 001.75 3.75C7 8 17 8 17 8z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default Icon389Icon;
/* prettier-ignore-end */