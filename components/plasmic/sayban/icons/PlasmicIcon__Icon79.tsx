/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon79IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon79Icon(props: Icon79IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"currentColor"}
      version={"1.1"}
      viewBox={"-1.5 0 20 20"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        fill={"currentColor"}
        fillRule={"evenodd"}
        d={
          "M12.75 14h-8.5V8c0-2.666 2.125-4 4.249-4H8.5c2.124 0 4.249 1.334 4.249 4zm-3.187 3c0 .552-.476 1-1.063 1s-1.062-.448-1.062-1v-1h2.125zm6.374-3h-1.062V8c0-3.553-2.516-5.525-5.312-5.921V0H7.437v2.079C4.642 2.475 2.125 4.447 2.125 8v6H1.063C.476 14 0 14.448 0 15s.476 1 1.063 1h4.25v1c0 1.657 1.426 3 3.187 3s3.188-1.343 3.188-3v-1h4.25c.586 0 1.062-.448 1.062-1s-.476-1-1.062-1"
        }
      ></path>
    </svg>
  );
}

export default Icon79Icon;
/* prettier-ignore-end */
