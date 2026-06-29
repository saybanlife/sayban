/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon120IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon120Icon(props: Icon120IconProps) {
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
        fillRule={"evenodd"}
        d={
          "M5 9.5C5 6.094 8.01 3 12 3s7 3.094 7 6.5c0 2.145-1.312 4.54-3.04 6.761-1.364 1.755-2.883 3.272-3.96 4.333-1.077-1.061-2.596-2.578-3.96-4.333C6.311 14.041 5 11.645 5 9.5M12 1C6.99 1 3 4.906 3 9.5c0 2.855 1.688 5.71 3.46 7.989 1.535 1.973 3.26 3.668 4.337 4.728q.28.275.496.49a1 1 0 0 0 1.414 0q.216-.215.496-.49c1.078-1.06 2.802-2.755 4.336-4.728C19.312 15.209 21 12.355 21 9.5 21 4.906 17.01 1 12 1m0 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"
        }
        clipRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default Icon120Icon;
/* prettier-ignore-end */
