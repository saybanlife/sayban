/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon116IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon116Icon(props: Icon116IconProps) {
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
          "M22 21.25H2c-.41 0-.75.34-.75.75s.34.75.75.75h20c.41 0 .75-.34.75-.75s-.34-.75-.75-.75"
        }
      ></path>

      <path
        fill={"currentColor"}
        d={
          "M17 2H7C4 2 3 3.79 3 6v16h6v-6.06c0-.52.42-.94.94-.94h4.13c.51 0 .94.42.94.94V22h6V6C21 3.79 20 2 17 2m-2.5 7.25h-1.75V11c0 .41-.34.75-.75.75s-.75-.34-.75-.75V9.25H9.5c-.41 0-.75-.34-.75-.75s.34-.75.75-.75h1.75V6c0-.41.34-.75.75-.75s.75.34.75.75v1.75h1.75c.41 0 .75.34.75.75s-.34.75-.75.75"
        }
      ></path>
    </svg>
  );
}

export default Icon116Icon;
/* prettier-ignore-end */
