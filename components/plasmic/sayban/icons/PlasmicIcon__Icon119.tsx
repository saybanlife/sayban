/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon119IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon119Icon(props: Icon119IconProps) {
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

      <g fill={"currentColor"}>
        <path
          d={
            "M12.18 10.79a.75.75 0 0 1-.58-.27L7 5a.75.75 0 0 1 0-1l1.82-1.86a.75.75 0 0 1 .55-.23h5.52c.199 0 .39.08.53.22l1.81 1.8a.76.76 0 0 1 .05 1l-4.52 5.57a.72.72 0 0 1-.58.28zM8.59 4.56l3.58 4.3 3.52-4.34-1.11-1.11H9.69z"
          }
        ></path>

        <path
          d={
            "M12.14 21.18A7.14 7.14 0 0 1 7.09 9a.75.75 0 1 1 1.06 1.06 5.64 5.64 0 1 0 8 0 .75.75 0 0 1 0-1.06.74.74 0 0 1 1.06 0 7.14 7.14 0 0 1-5.05 12.19z"
          }
        ></path>
      </g>
    </svg>
  );
}

export default Icon119Icon;
/* prettier-ignore-end */
