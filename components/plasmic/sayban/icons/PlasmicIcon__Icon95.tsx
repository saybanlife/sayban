/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon95IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon95Icon(props: Icon95IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      xmlnsXlink={"http://www.w3.org/1999/xlink"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <g clipPath={"url(#a)"}>
        <path
          fill={"#292D32"}
          d={
            "M20.62 8.45c-1.05-4.62-5.08-6.7-8.62-6.7h-.01c-3.53 0-7.57 2.07-8.62 6.69-1.17 5.16 1.99 9.53 4.85 12.28A5.44 5.44 0 0 0 12 22.25c1.36 0 2.72-.51 3.77-1.53 2.86-2.75 6.02-7.11 4.85-12.27M12 13.46a3.15 3.15 0 1 1-.002-6.3 3.15 3.15 0 0 1 .001 6.3"
          }
        ></path>
      </g>

      <defs>
        <clipPath id={"a"}>
          <path fill={"#fff"} d={"M0 0h24v24H0z"}></path>
        </clipPath>
      </defs>
    </svg>
  );
}

export default Icon95Icon;
/* prettier-ignore-end */
