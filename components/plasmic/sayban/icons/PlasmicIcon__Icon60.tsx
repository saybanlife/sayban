/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon60IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon60Icon(props: Icon60IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"currentColor"}
      viewBox={"0 0 256 256"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        d={
          "M108 60a16 16 0 1 1-16-16 16 16 0 0 1 16 16m56 16a16 16 0 1 0-16-16 16 16 0 0 0 16 16m-72 36a16 16 0 1 0 16 16 16 16 0 0 0-16-16m72 0a16 16 0 1 0 16 16 16 16 0 0 0-16-16m-72 68a16 16 0 1 0 16 16 16 16 0 0 0-16-16m72 0a16 16 0 1 0 16 16 16 16 0 0 0-16-16"
        }
      ></path>
    </svg>
  );
}

export default Icon60Icon;
/* prettier-ignore-end */
