/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon112IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon112Icon(props: Icon112IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      stroke={"currentColor"}
      className={classNames("plasmic-default__svg", className, "h-6 w-6")}
      viewBox={"0 0 24 24"}
      height={"1em"}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        strokeLinecap={"round"}
        strokeLinejoin={"round"}
        strokeWidth={"2"}
        d={"M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0"}
      ></path>
    </svg>
  );
}

export default Icon112Icon;
/* prettier-ignore-end */
