/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon26IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon26Icon(props: Icon26IconProps) {
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

      <g filter={"url(#a)"}>
        <g filter={"url(#b)"}>
          <path
            fill={"url(#c)"}
            d={
              "M6 3.5c0-.466 0-.699.076-.883a1 1 0 0 1 .541-.54C6.801 2 7.034 2 7.5 2h9c.466 0 .699 0 .883.076a1 1 0 0 1 .54.541c.077.184.077.417.077.883s0 .699-.076.883a1 1 0 0 1-.541.54C17.199 5 16.966 5 16.5 5h-9c-.466 0-.699 0-.883-.076a1 1 0 0 1-.54-.541C6 4.199 6 3.966 6 3.5"
            }
          ></path>
        </g>

        <g filter={"url(#d)"}>
          <path
            fill={"url(#e)"}
            d={
              "M4 10.923v6.629a4 4 0 0 0 .025.448h15.951q.024-.217.024-.435v-6.657q0-.464-.105-.908H4.108Q4 10.451 4 10.922"
            }
          ></path>
        </g>

        <g filter={"url(#f)"}>
          <path
            fill={"url(#g)"}
            d={
              "M5.501 7.799 9.001 5h6.017l1.142.891 2.357 1.908A4 4 0 0 1 19.896 10H4.108a4 4 0 0 1 1.393-2.201"
            }
          ></path>
        </g>

        <g filter={"url(#h)"}>
          <path
            fill={"url(#i)"}
            d={
              "M4.025 18a4 4 0 0 0 .902 2.113c.366.438.549.658.75.842a4 4 0 0 0 2.153 1.008C8.1 22 8.386 22 8.957 22h6.685a4 4 0 0 0 3.088-1.457l.358-.435A4 4 0 0 0 19.977 18z"
            }
          ></path>
        </g>

        <g filter={"url(#j)"}>
          <path
            fill={"url(#k)"}
            fillRule={"evenodd"}
            d={
              "M12 11.25a.75.75 0 0 1 .75.75v1.25H14a.75.75 0 0 1 0 1.5h-1.25V16a.75.75 0 0 1-1.5 0v-1.25H10a.75.75 0 0 1 0-1.5h1.25V12a.75.75 0 0 1 .75-.75"
            }
            clipRule={"evenodd"}
          ></path>
        </g>
      </g>

      <defs>
        <filter
          id={"a"}
          width={"24"}
          height={"28"}
          x={"0"}
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
            values={"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"}
          ></feColorMatrix>

          <feBlend
            in2={"BackgroundImageFix"}
            mode={"normal"}
            result={"effect1_dropShadow_1_19"}
          ></feBlend>

          <feBlend
            in={"SourceGraphic"}
            in2={"effect1_dropShadow_1_19"}
            mode={"normal"}
            result={"shape"}
          ></feBlend>
        </filter>

        <filter
          id={"b"}
          width={"12"}
          height={"3.1"}
          x={"6"}
          y={"1.9"}
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

          <feOffset dy={"-.1"}></feOffset>

          <feGaussianBlur stdDeviation={".5"}></feGaussianBlur>

          <feComposite
            in2={"hardAlpha"}
            k2={"-1"}
            k3={"1"}
            operator={"arithmetic"}
          ></feComposite>

          <feColorMatrix
            type={"matrix"}
            values={"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"}
          ></feColorMatrix>

          <feBlend
            in2={"shape"}
            mode={"normal"}
            result={"effect1_innerShadow_1_19"}
          ></feBlend>
        </filter>

        <filter
          id={"d"}
          width={"16"}
          height={"8.2"}
          x={"4"}
          y={"9.8"}
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

          <feOffset dy={"-.2"}></feOffset>

          <feGaussianBlur stdDeviation={".5"}></feGaussianBlur>

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
            result={"effect1_innerShadow_1_19"}
          ></feBlend>
        </filter>

        <filter
          id={"f"}
          width={"15.788"}
          height={"5"}
          x={"4.108"}
          y={"5"}
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

          <feOffset></feOffset>

          <feGaussianBlur stdDeviation={".5"}></feGaussianBlur>

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
            result={"effect1_innerShadow_1_19"}
          ></feBlend>
        </filter>

        <filter
          id={"h"}
          width={"15.951"}
          height={"4"}
          x={"4.025"}
          y={"18"}
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

          <feOffset></feOffset>

          <feGaussianBlur stdDeviation={".5"}></feGaussianBlur>

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
            result={"effect1_innerShadow_1_19"}
          ></feBlend>
        </filter>

        <filter
          id={"j"}
          width={"7.5"}
          height={"7.5"}
          x={"8.25"}
          y={"10.25"}
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

          <feGaussianBlur stdDeviation={".5"}></feGaussianBlur>

          <feComposite in2={"hardAlpha"} operator={"out"}></feComposite>

          <feColorMatrix
            type={"matrix"}
            values={"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"}
          ></feColorMatrix>

          <feBlend
            in2={"BackgroundImageFix"}
            mode={"normal"}
            result={"effect1_dropShadow_1_19"}
          ></feBlend>

          <feBlend
            in={"SourceGraphic"}
            in2={"effect1_dropShadow_1_19"}
            mode={"normal"}
            result={"shape"}
          ></feBlend>

          <feColorMatrix
            in={"SourceAlpha"}
            result={"hardAlpha"}
            type={"matrix"}
            values={"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"}
          ></feColorMatrix>

          <feOffset dy={".05"}></feOffset>

          <feGaussianBlur stdDeviation={".5"}></feGaussianBlur>

          <feComposite
            in2={"hardAlpha"}
            k2={"-1"}
            k3={"1"}
            operator={"arithmetic"}
          ></feComposite>

          <feColorMatrix
            type={"matrix"}
            values={"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"}
          ></feColorMatrix>

          <feBlend
            in2={"shape"}
            mode={"normal"}
            result={"effect2_innerShadow_1_19"}
          ></feBlend>
        </filter>

        <linearGradient
          id={"c"}
          x1={"12"}
          x2={"12"}
          y1={"2"}
          y2={"5"}
          gradientUnits={"userSpaceOnUse"}
        >
          <stop stopColor={"#FFD111"}></stop>

          <stop offset={"1"} stopColor={"#EBC729"}></stop>
        </linearGradient>

        <linearGradient
          id={"e"}
          x1={"12"}
          x2={"12"}
          y1={"10"}
          y2={"18"}
          gradientUnits={"userSpaceOnUse"}
        >
          <stop stopColor={"#FEFDFC"}></stop>

          <stop offset={"1"} stopColor={"#FFF5F6"}></stop>
        </linearGradient>

        <linearGradient
          id={"g"}
          x1={"12.002"}
          x2={"12.002"}
          y1={"5"}
          y2={"10"}
          gradientUnits={"userSpaceOnUse"}
        >
          <stop stopColor={"#FCFFFE"}></stop>

          <stop offset={"1"} stopColor={"#F1F5FE"}></stop>
        </linearGradient>

        <linearGradient
          id={"i"}
          x1={"12.001"}
          x2={"12.001"}
          y1={"18"}
          y2={"22"}
          gradientUnits={"userSpaceOnUse"}
        >
          <stop stopColor={"#FCFFFE"}></stop>

          <stop offset={"1"} stopColor={"#F1F5FE"}></stop>
        </linearGradient>

        <linearGradient
          id={"k"}
          x1={"12"}
          x2={"12"}
          y1={"11.25"}
          y2={"16.75"}
          gradientUnits={"userSpaceOnUse"}
        >
          <stop stopColor={"#FFD111"}></stop>

          <stop offset={"1"} stopColor={"#EBC729"}></stop>
        </linearGradient>
      </defs>
    </svg>
  );
}

export default Icon26Icon;
/* prettier-ignore-end */
