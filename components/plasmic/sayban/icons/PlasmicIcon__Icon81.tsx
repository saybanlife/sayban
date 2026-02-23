/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon81IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon81Icon(props: Icon81IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"currentColor"}
      version={"1.1"}
      viewBox={"0 0 512 512"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        fill={"currentColor"}
        fillRule={"evenodd"}
        d={
          "M256 42.667C138.18 42.667 42.667 138.178 42.667 256c0 117.82 95.513 213.333 213.333 213.333 117.822 0 213.333-95.513 213.333-213.333 0-117.822-95.511-213.333-213.333-213.333m0 384c-94.105 0-170.667-76.562-170.667-170.667S161.895 85.333 256 85.333c94.107 0 170.667 76.562 170.667 170.667S350.107 426.667 256 426.667m26.713-256c0 15.467-11.261 26.666-26.496 26.666-15.852 0-26.837-11.199-26.837-26.962 0-15.15 11.283-26.371 26.837-26.371 15.235 0 26.496 11.22 26.496 26.667m-48 64h42.667v128h-42.667z"
        }
      ></path>
    </svg>
  );
}

export default Icon81Icon;
/* prettier-ignore-end */
