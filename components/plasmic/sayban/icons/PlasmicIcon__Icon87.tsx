/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon87IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon87Icon(props: Icon87IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 16 16"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <g fill={"currentColor"}>
        <path
          d={
            "M1 8a6 6 0 0 1 8.514-5.45.75.75 0 0 1-.629 1.363 4.5 4.5 0 1 0 0 8.175.75.75 0 1 1 .63 1.361A6 6 0 0 1 1 8"
          }
        ></path>

        <path
          d={
            "M11.245 4.695a.75.75 0 0 0-.05 1.06l1.36 1.495H6.75a.75.75 0 0 0 0 1.5h5.805l-1.36 1.495a.75.75 0 0 0 1.11 1.01l2.5-2.75a.75.75 0 0 0-.002-1.012l-2.498-2.748a.75.75 0 0 0-1.06-.05"
          }
        ></path>
      </g>
    </svg>
  );
}

export default Icon87Icon;
/* prettier-ignore-end */
