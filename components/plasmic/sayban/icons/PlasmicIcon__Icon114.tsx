/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon114IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon114Icon(props: Icon114IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      stroke={"currentColor"}
      className={classNames(
        "plasmic-default__svg",
        className,
        "h-5 w-5 text-gray-500 transition-transform duration-300 transform rotate-180"
      )}
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
        d={"m19 9-7 7-7-7"}
      ></path>
    </svg>
  );
}

export default Icon114Icon;
/* prettier-ignore-end */
