/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon31IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon31Icon(props: Icon31IconProps) {
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
            fill={"#FBFCFE"}
            stroke={"#7E72BE"}
            strokeWidth={"1.3"}
            d={
              "M8.121 10.057c3.204 0 5.822 2.62 5.822 5.823s-2.618 5.822-5.822 5.822-5.823-2.619-5.823-5.822c0-3.204 2.62-5.824 5.823-5.824Z"
            }
          ></path>
        </g>

        <g filter={"url(#d)"}>
          <path
            fill={"#FBFCFE"}
            d={
              "M21.052 17.819h-1.358a2.74 2.74 0 0 0-1.875-1.875l-1.681-6.4c-.259-.841-1.035-1.423-1.875-1.423H7.28l-.84-3.104c-.259-.84-1.035-1.422-1.875-1.422H2.948c-.388 0-.646.258-.646.646s.258.647.646.647h1.617c.258 0 .517.194.646.453l1.164 4.331c.517-.194 1.1-.258 1.746-.258 3.362 0 6.077 2.586 6.4 5.819h1.746l.194.776c-1.099.323-1.875 1.293-1.875 2.456a2.594 2.594 0 0 0 2.586 2.587c1.229 0 2.199-.84 2.522-1.94h1.358c.388 0 .646-.259.646-.646 0-.388-.258-.647-.646-.647"
            }
          ></path>
        </g>
      </g>

      <defs>
        <filter
          id={"b"}
          width={"28.05"}
          height={"26.757"}
          x={"-2.352"}
          y={"-.405"}
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
            result={"effect1_dropShadow_10_15"}
          ></feBlend>

          <feBlend
            in={"SourceGraphic"}
            in2={"effect1_dropShadow_10_15"}
            mode={"normal"}
            result={"shape"}
          ></feBlend>
        </filter>

        <filter
          id={"c"}
          width={"12.945"}
          height={"15.945"}
          x={"1.648"}
          y={"6.407"}
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
            result={"effect1_innerShadow_10_15"}
          ></feBlend>
        </filter>

        <filter
          id={"d"}
          width={"19.397"}
          height={"20.457"}
          x={"2.302"}
          y={".595"}
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
            values={"0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"}
          ></feColorMatrix>

          <feBlend
            in2={"shape"}
            mode={"normal"}
            result={"effect1_innerShadow_10_15"}
          ></feBlend>
        </filter>

        <clipPath id={"a"}>
          <path fill={"#fff"} d={"M0 0h24v24H0z"}></path>
        </clipPath>
      </defs>
    </svg>
  );
}

export default Icon31Icon;
/* prettier-ignore-end */
