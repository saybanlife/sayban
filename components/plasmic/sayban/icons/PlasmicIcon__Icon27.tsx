/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon27IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon27Icon(props: Icon27IconProps) {
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

      <g clipPath={"url(#a)"} filter={"url(#b)"}>
        <g filter={"url(#c)"}>
          <path
            fill={"url(#d)"}
            d={
              "M2 9.318c0 3.729 4.02 7.673 6.962 10.06C10.294 20.46 10.96 21 12 21s1.706-.54 3.038-1.621C17.981 16.99 22 13.047 22 9.317c0-6.23-5.5-8.556-10-3.743C7.5.761 2 3.087 2 9.318"
            }
          ></path>
        </g>

        <g filter={"url(#e)"}>
          <path
            fill={"#5698E6"}
            fillRule={"evenodd"}
            d={
              "M16.5 6.25a.75.75 0 0 1 .75.75v1.25h1.25a.75.75 0 0 1 0 1.5h-1.25V11a.75.75 0 0 1-1.5 0V9.75H14.5a.75.75 0 0 1 0-1.5h1.25V7a.75.75 0 0 1 .75-.75"
            }
            clipRule={"evenodd"}
          ></path>
        </g>
      </g>

      <defs>
        <filter
          id={"b"}
          width={"28"}
          height={"26"}
          x={"-2"}
          y={"-1"}
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
            values={"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"}
          ></feColorMatrix>

          <feBlend
            in2={"BackgroundImageFix"}
            mode={"normal"}
            result={"effect1_dropShadow_1_27"}
          ></feBlend>

          <feBlend
            in={"SourceGraphic"}
            in2={"effect1_dropShadow_1_27"}
            mode={"normal"}
            result={"shape"}
          ></feBlend>
        </filter>

        <filter
          id={"c"}
          width={"20"}
          height={"21"}
          x={"2"}
          y={"0"}
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

          <feOffset dy={"-3"}></feOffset>

          <feGaussianBlur stdDeviation={"2"}></feGaussianBlur>

          <feComposite
            in2={"hardAlpha"}
            k2={"-1"}
            k3={"1"}
            operator={"arithmetic"}
          ></feComposite>

          <feColorMatrix
            type={"matrix"}
            values={"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"}
          ></feColorMatrix>

          <feBlend
            in2={"shape"}
            mode={"normal"}
            result={"effect1_innerShadow_1_27"}
          ></feBlend>
        </filter>

        <filter
          id={"e"}
          width={"9.5"}
          height={"9.5"}
          x={"11.75"}
          y={"4.25"}
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

          <feGaussianBlur stdDeviation={"1"}></feGaussianBlur>

          <feComposite in2={"hardAlpha"} operator={"out"}></feComposite>

          <feColorMatrix
            type={"matrix"}
            values={"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"}
          ></feColorMatrix>

          <feBlend
            in2={"BackgroundImageFix"}
            mode={"normal"}
            result={"effect1_dropShadow_1_27"}
          ></feBlend>

          <feBlend
            in={"SourceGraphic"}
            in2={"effect1_dropShadow_1_27"}
            mode={"normal"}
            result={"shape"}
          ></feBlend>

          <feColorMatrix
            in={"SourceAlpha"}
            result={"hardAlpha"}
            type={"matrix"}
            values={"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"}
          ></feColorMatrix>

          <feOffset dy={".2"}></feOffset>

          <feGaussianBlur stdDeviation={"2"}></feGaussianBlur>

          <feComposite
            in2={"hardAlpha"}
            k2={"-1"}
            k3={"1"}
            operator={"arithmetic"}
          ></feComposite>

          <feColorMatrix
            type={"matrix"}
            values={"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"}
          ></feColorMatrix>

          <feBlend
            in2={"shape"}
            mode={"normal"}
            result={"effect2_innerShadow_1_27"}
          ></feBlend>
        </filter>

        <linearGradient
          id={"d"}
          x1={"12"}
          x2={"12"}
          y1={"3"}
          y2={"21"}
          gradientUnits={"userSpaceOnUse"}
        >
          <stop stopColor={"#FDFEFF"}></stop>

          <stop offset={"1"} stopColor={"#F1F5FE"}></stop>
        </linearGradient>

        <clipPath id={"a"}>
          <path fill={"#fff"} d={"M0 0h24v24H0z"}></path>
        </clipPath>
      </defs>
    </svg>
  );
}

export default Icon27Icon;
/* prettier-ignore-end */
