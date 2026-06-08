/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon66IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon66Icon(props: Icon66IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      xmlnsXlink={"http://www.w3.org/1999/xlink"}
      fill={"none"}
      viewBox={"0 0 100 100"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <g clipPath={"url(#a)"}>
        <mask
          id={"b"}
          width={"100"}
          height={"100"}
          x={"0"}
          y={"0"}
          maskUnits={"userSpaceOnUse"}
          style={{
            maskType: 'luminance"'
          }}
        >
          <path fill={"#fff"} d={"M100 0H0v100h100z"}></path>
        </mask>

        <g mask={"url(#b)"}>
          <path
            fill={"#617A39"}
            d={
              "M55.99 15.43a6.23 6.23 0 0 1-3.49 6.45v67.34c0 .43-.35.78-.78.78h-3.78a.86.86 0 0 1-.86-.86V60.76H37.2c-.58 0-1.14-.2-1.58-.57l-7.02-5.86a.787.787 0 0 1 .03-1.23l7.5-5.66c.37-.28.81-.43 1.27-.43h9.68V39.8l-17.16-6.74c-.43-.17-.8-.47-1.05-.86l-5.8-8.99a.78.78 0 0 1 .28-1.1l5.22-2.81c.43-.23.95-.27 1.41-.09l17.1 6.61v-3.94c-2.1-1-3.54-3.15-3.54-5.63 0-3.71 3.24-6.67 7.04-6.2 2.78.34 5.07 2.6 5.42 5.38z"
            }
          ></path>

          <path
            fill={"#617A39"}
            d={
              "m72.69 50.5-17.2-6.98a.84.84 0 0 1-.52-.77V30.56c0-.59.6-.99 1.14-.76l16.7 6.89c.16.06.29.17.38.32l6.02 9.32c.26.41.12.95-.3 1.18l-5.51 2.97c-.22.12-.47.13-.7.04z"
            }
          ></path>

          <path
            fill={"#F5CC4F"}
            d={
              "M30.59 60.76h-5.05c-.13 0-.26-.05-.36-.13l-7.77-6.48a.56.56 0 0 1 .02-.88l8.14-6.14c.1-.07.22-.11.34-.11h4.49c.53 0 .77.67.35 1l-6.52 5.25c-.28.22-.28.64 0 .87l6.72 5.64c.4.34.16.99-.36.99z"
            }
          ></path>

          <path
            fill={"#617A39"}
            d={
              "m81.85 61.18-7.33-4.66c-.16-.1-.35-.16-.54-.16H56.04c-.56 0-1.01.45-1.01 1.01v9.55c0 .56.45 1.01 1.01 1.01h18.3c.21 0 .41-.06.58-.18l6.97-4.9c.59-.41.57-1.29-.04-1.68z"
            }
          ></path>
        </g>
      </g>

      <defs>
        <clipPath id={"a"}>
          <path fill={"#fff"} d={"M0 0h100v100H0z"}></path>
        </clipPath>
      </defs>
    </svg>
  );
}

export default Icon66Icon;
/* prettier-ignore-end */
