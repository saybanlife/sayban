/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon70IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon70Icon(props: Icon70IconProps) {
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

      <g fill={"currentColor"} fillRule={"evenodd"} clipRule={"evenodd"}>
        <path
          d={
            "m4.337 16.071-.394 3.618a.5.5 0 0 0 .55.551l3.619-.394a1.5 1.5 0 0 0 .898-.43L20 8.423a1.5 1.5 0 0 0 0-2.121l-2.12-2.12a1.5 1.5 0 0 0-2.121 0L4.766 15.172a1.5 1.5 0 0 0-.43.899M18.94 3.121l2.12 2.121a3 3 0 0 1 0 4.243L10.07 20.476a3 3 0 0 1-1.797.861l-3.618.394a2 2 0 0 1-2.204-2.205l.394-3.617a3 3 0 0 1 .86-1.797L14.699 3.121a3 3 0 0 1 4.243 0"
          }
        ></path>

        <path
          d={
            "M20.001 6.303 17.88 4.182a1.5 1.5 0 0 0-2.121 0l-1.273 1.272 4.242 4.243 1.273-1.273a1.5 1.5 0 0 0 0-2.121m-1.273 5.515-6.364-6.364 2.334-2.333a3 3 0 0 1 4.243 0l2.12 2.121a3 3 0 0 1 0 4.243z"
          }
        ></path>
      </g>
    </svg>
  );
}

export default Icon70Icon;
/* prettier-ignore-end */
