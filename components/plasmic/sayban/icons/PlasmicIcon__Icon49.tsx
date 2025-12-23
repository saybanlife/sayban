/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon49IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon49Icon(props: Icon49IconProps) {
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
        stroke={"currentColor"}
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"2"}
        d={"M16.673 16.641 21 21m-2-10a8 8 0 1 1-16 0 8 8 0 0 1 16 0"}
      ></path>
    </svg>
  );
}

export default Icon49Icon;
/* prettier-ignore-end */
