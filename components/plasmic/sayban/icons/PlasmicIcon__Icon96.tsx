/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon96IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon96Icon(props: Icon96IconProps) {
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
          "M20.62 8.45c-1.05-4.62-5.08-6.7-8.62-6.7h-.01c-3.53 0-7.57 2.07-8.62 6.69-1.17 5.16 1.99 9.53 4.85 12.28A5.44 5.44 0 0 0 12 22.25c1.36 0 2.72-.51 3.77-1.53 2.86-2.75 6.02-7.11 4.85-12.27"
        }
        opacity={".4"}
      ></path>

      <path
        fill={"currentColor"}
        d={"M12 13.46a3.15 3.15 0 1 0 0-6.3 3.15 3.15 0 0 0 0 6.3"}
      ></path>
    </svg>
  );
}

export default Icon96Icon;
/* prettier-ignore-end */
