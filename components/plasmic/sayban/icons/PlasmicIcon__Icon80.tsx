/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon80IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon80Icon(props: Icon80IconProps) {
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
          "M3 11.985A9.81 9.81 0 0 0 12.569 22a9.53 9.53 0 0 0 8.309-5.059 1 1 0 0 0-.947-1.477l-.11.008c-.131.01-.263.02-.4.02a7.81 7.81 0 0 1-7.569-8.015 8.4 8.4 0 0 1 1.016-4A1 1 0 0 0 11.923 2 9.855 9.855 0 0 0 3 11.985m7.343-7.652a10.4 10.4 0 0 0-.488 3.144 9.89 9.89 0 0 0 8.282 9.923 7.4 7.4 0 0 1-5.568 2.6A7.81 7.81 0 0 1 5 11.985a7.99 7.99 0 0 1 5.343-7.652"
        }
      ></path>
    </svg>
  );
}

export default Icon80Icon;
/* prettier-ignore-end */
