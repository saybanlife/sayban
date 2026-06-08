/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon308IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon308Icon(props: Icon308IconProps) {
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
        d={
          "M16 13.385a4.68 4.68 0 0 1-1.318 3.263A4.5 4.5 0 0 1 13 17.736m6-4.044C19 7.115 12 2 12 2S5 7.115 5 13.692c0 1.938.737 3.797 2.05 5.168S10.144 21 12 21s3.637-.77 4.95-2.14S19 15.63 19 13.691"
        }
      ></path>
    </svg>
  );
}

export default Icon308Icon;
/* prettier-ignore-end */
