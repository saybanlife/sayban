/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon324IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon324Icon(props: Icon324IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      xmlnsXlink={"http://www.w3.org/1999/xlink"}
      fill={"none"}
      viewBox={"0 0 32 32"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <circle cx={"16"} cy={"16"} r={"14"} fill={"url(#a)"}></circle>

      <path
        fill={"#fff"}
        d={
          "M22.987 10.209c.124-.806-.642-1.441-1.358-1.127L7.365 15.345c-.514.225-.476 1.003.056 1.173l2.942.937c.562.179 1.17.086 1.66-.253l6.632-4.582c.2-.138.418.147.247.323l-4.774 4.922c-.463.477-.371 1.286.186 1.636l5.345 3.351c.6.376 1.37-.001 1.483-.726z"
        }
      ></path>

      <defs>
        <linearGradient
          id={"a"}
          x1={"16"}
          x2={"16"}
          y1={"2"}
          y2={"30"}
          gradientUnits={"userSpaceOnUse"}
        >
          <stop stopColor={"#37BBFE"}></stop>

          <stop offset={"1"} stopColor={"#007DBB"}></stop>
        </linearGradient>
      </defs>
    </svg>
  );
}

export default Icon324Icon;
/* prettier-ignore-end */
