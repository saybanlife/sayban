/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon118IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon118Icon(props: Icon118IconProps) {
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
          "M14 5c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2m0 14c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2m0-7c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2"
        }
      ></path>
    </svg>
  );
}

export default Icon118Icon;
/* prettier-ignore-end */
