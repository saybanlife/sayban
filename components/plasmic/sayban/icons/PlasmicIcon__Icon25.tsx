/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon25IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon25Icon(props: Icon25IconProps) {
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
        <path fill={"#7FD2C7"} d={"M3 6h18v16H3z"}></path>

        <path fill={"#7FD2C7"} d={"M8 3h8v15H8z"}></path>

        <g filter={"url(#b)"}>
          <path
            fill={"url(#c)"}
            fillRule={"evenodd"}
            d={
              "M10.75 2h2c1.886 0 2.828 0 3.414.586S16.75 4.114 16.75 6v15.25h5a.75.75 0 0 1 0 1.5h-20a.75.75 0 0 1 0-1.5h5V6c0-1.886 0-2.828.586-3.414S8.864 2 10.75 2m1 2.25a.75.75 0 0 1 .75.75v1.25h1.25a.75.75 0 0 1 0 1.5H12.5V9A.75.75 0 0 1 11 9V7.75H9.75a.75.75 0 0 1 0-1.5H11V5a.75.75 0 0 1 .75-.75M9 12a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5h-4A.75.75 0 0 1 9 12m0 3a.75.75 0 0 1 .75-.75h4a.75.75 0 0 1 0 1.5h-4A.75.75 0 0 1 9 15m2.75 3.25a.75.75 0 0 1 .75.75v2.25H11V19a.75.75 0 0 1 .75-.75"
            }
            clipRule={"evenodd"}
          ></path>
        </g>

        <g filter={"url(#d)"}>
          <path
            fill={"url(#e)"}
            d={
              "M20.913 5.889c.337.504.337 1.206.337 2.611v12.75h.5a.75.75 0 0 1 0 1.5h-20a.75.75 0 1 1 0-1.5h.5V8.5c0-1.405 0-2.107.337-2.611a2 2 0 0 1 .552-.552c.441-.295 2.537-.332 3.618-.336q-.005.437-.004.91V7.25H4.25a.75.75 0 1 0 0 1.5h2.503v1.5H4.25a.75.75 0 0 0 0 1.5h2.503v1.5H4.25a.75.75 0 0 0 0 1.5h2.503v6.5h10v-6.5h2.497a.75.75 0 1 0 0-1.5h-2.497v-1.5h2.497a.75.75 0 1 0 0-1.5h-2.497v-1.5h2.497a.75.75 0 0 0 0-1.5h-2.497V5.91q.001-.47-.004-.91c1.081.005 3.17.042 3.612.337a2 2 0 0 1 .552.552"
            }
          ></path>
        </g>
      </g>

      <defs>
        <linearGradient
          id={"c"}
          x1={"11.75"}
          x2={"11.75"}
          y1={"2"}
          y2={"22.75"}
          gradientUnits={"userSpaceOnUse"}
        >
          <stop stopColor={"#FEFEFE"}></stop>

          <stop offset={"1"} stopColor={"#EFF5FE"}></stop>
        </linearGradient>

        <linearGradient
          id={"e"}
          x1={"11.75"}
          x2={"11.75"}
          y1={"5.001"}
          y2={"22.75"}
          gradientUnits={"userSpaceOnUse"}
        >
          <stop stopColor={"#F2F2F2"}></stop>

          <stop offset={"1"} stopColor={"#E6E6E6"}></stop>
        </linearGradient>

        <filter
          id={"b"}
          width={"29.5"}
          height={"28.75"}
          x={"-3"}
          y={"-2"}
          colorInterpolationFilters={"sRGB"}
          filterUnits={"userSpaceOnUse"}
        >
          <feFlood floodOpacity={"0"} result={"BackgroundImageFix"}></feFlood>

          <feColorMatrix
            in={"SourceAlpha"}
            result={"hardAlpha"}
            type={"matrix"}
            values={"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"}
          ></feColorMatrix>

          <feOffset></feOffset>

          <feGaussianBlur stdDeviation={"2"}></feGaussianBlur>

          <feComposite in2={"hardAlpha"} operator={"out"}></feComposite>

          <feColorMatrix
            type={"matrix"}
            values={"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.3 0"}
          ></feColorMatrix>

          <feBlend
            in2={"BackgroundImageFix"}
            mode={"normal"}
            result={"effect1_dropShadow_1_7"}
          ></feBlend>

          <feBlend
            in={"SourceGraphic"}
            in2={"effect1_dropShadow_1_7"}
            mode={"normal"}
            result={"shape"}
          ></feBlend>

          <feColorMatrix
            in={"SourceAlpha"}
            result={"hardAlpha"}
            type={"matrix"}
            values={"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"}
          ></feColorMatrix>

          <feOffset dy={"-.1"}></feOffset>

          <feGaussianBlur stdDeviation={"2"}></feGaussianBlur>

          <feComposite
            in2={"hardAlpha"}
            k2={"-1"}
            k3={"1"}
            operator={"arithmetic"}
          ></feComposite>

          <feColorMatrix
            type={"matrix"}
            values={"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"}
          ></feColorMatrix>

          <feBlend
            in2={"shape"}
            mode={"normal"}
            result={"effect2_innerShadow_1_7"}
          ></feBlend>
        </filter>

        <filter
          id={"d"}
          width={"21.5"}
          height={"17.849"}
          x={"1"}
          y={"5.001"}
          colorInterpolationFilters={"sRGB"}
          filterUnits={"userSpaceOnUse"}
        >
          <feFlood floodOpacity={"0"} result={"BackgroundImageFix"}></feFlood>

          <feBlend
            in={"SourceGraphic"}
            in2={"BackgroundImageFix"}
            mode={"normal"}
            result={"shape"}
          ></feBlend>

          <feColorMatrix
            in={"SourceAlpha"}
            result={"hardAlpha"}
            type={"matrix"}
            values={"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"}
          ></feColorMatrix>

          <feOffset dy={".1"}></feOffset>

          <feGaussianBlur stdDeviation={"2"}></feGaussianBlur>

          <feComposite
            in2={"hardAlpha"}
            k2={"-1"}
            k3={"1"}
            operator={"arithmetic"}
          ></feComposite>

          <feColorMatrix
            type={"matrix"}
            values={"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"}
          ></feColorMatrix>

          <feBlend
            in2={"shape"}
            mode={"normal"}
            result={"effect1_innerShadow_1_7"}
          ></feBlend>
        </filter>

        <clipPath id={"a"}>
          <path fill={"#fff"} d={"M0 0h24v24H0z"}></path>
        </clipPath>
      </defs>
    </svg>
  );
}

export default Icon25Icon;
/* prettier-ignore-end */
