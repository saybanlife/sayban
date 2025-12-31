/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon61IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon61Icon(props: Icon61IconProps) {
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
          "M21.3 7.58h-5.58c-.39 0-.7-.31-.7-.7s.31-.7.7-.7h5.58c.39 0 .7.31.7.7s-.31.7-.7.7m-14.88 0H2.7c-.39 0-.7-.31-.7-.7s.31-.7.7-.7h3.72c.39 0 .7.31.7.7s-.32.7-.7.7"
        }
      ></path>

      <path
        fill={"currentColor"}
        d={
          "M10.14 10.83a3.95 3.95 0 1 0 0-7.9 3.95 3.95 0 0 0 0 7.9m11.16 6.98h-3.72c-.39 0-.7-.31-.7-.7s.31-.7.7-.7h3.72c.39 0 .7.31.7.7s-.31.7-.7.7m-13.02 0H2.7c-.39 0-.7-.31-.7-.7s.31-.7.7-.7h5.58c.39 0 .7.31.7.7s-.32.7-.7.7"
        }
      ></path>

      <path
        fill={"currentColor"}
        d={"M13.86 21.07a3.95 3.95 0 1 0 0-7.9 3.95 3.95 0 0 0 0 7.9"}
      ></path>
    </svg>
  );
}

export default Icon61Icon;
/* prettier-ignore-end */
