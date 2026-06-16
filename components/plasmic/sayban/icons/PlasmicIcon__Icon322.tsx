/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon322IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon322Icon(props: Icon322IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 13 28"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        fill={"currentColor"}
        d={
          "M11.24.353.36 13.077l-.06.066a1.3 1.3 0 0 0-.301.782v.15a1.3 1.3 0 0 0 .3.782l.054.054 10.885 12.736c.403.47 1.056.47 1.459 0 .403-.472.403-1.235 0-1.707L2.548 14.075 12.699 2.06c.403-.471.403-1.235 0-1.707-.403-.47-1.056-.47-1.459 0"
        }
      ></path>
    </svg>
  );
}

export default Icon322Icon;
/* prettier-ignore-end */
