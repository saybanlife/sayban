/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon10IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon10Icon(props: Icon10IconProps) {
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
        fill={"currentColor"}
        d={
          "M15.713 16.773 7.227 8.288a.755.755 0 0 1 0-1.06.756.756 0 0 1 1.061 0l8.485 8.484c.29.29.29.771 0 1.061s-.77.29-1.06 0"
        }
      ></path>

      <path
        fill={"currentColor"}
        d={
          "M7.227 16.773a.755.755 0 0 1 0-1.06l8.485-8.486c.29-.29.77-.29 1.06 0s.29.77 0 1.06l-8.485 8.486c-.29.29-.77.29-1.06 0"
        }
      ></path>
    </svg>
  );
}

export default Icon10Icon;
/* prettier-ignore-end */
