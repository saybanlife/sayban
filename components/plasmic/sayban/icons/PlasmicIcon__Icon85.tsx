/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon85IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon85Icon(props: Icon85IconProps) {
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
          "M10 21h4a2 2 0 0 1-4 0m-6.924-2.617a1 1 0 0 1 .217-1.09L5 15.586V10a7.006 7.006 0 0 1 6-6.92V2a1 1 0 0 1 2 0v1.08A7.006 7.006 0 0 1 19 10v5.586l1.707 1.707A1 1 0 0 1 20 19H4a1 1 0 0 1-.924-.617M6.414 17h11.172l-.293-.293A1 1 0 0 1 17 16v-6a5 5 0 0 0-10 0v6a1 1 0 0 1-.293.707Z"
        }
      ></path>
    </svg>
  );
}

export default Icon85Icon;
/* prettier-ignore-end */
