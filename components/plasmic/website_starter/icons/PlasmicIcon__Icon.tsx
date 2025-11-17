/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type IconIconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function IconIcon(props: IconIconProps) {
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
        <circle cx={"12"} cy={"8"} r={"4"}></circle>

        <path
          d={
            "M5.338 17.32C5.999 14.528 8.772 13 11.643 13h.714c2.871 0 5.644 1.527 6.305 4.32.128.541.23 1.107.287 1.682.055.55-.397.998-.949.998H6c-.552 0-1.004-.449-.949-.998.057-.575.159-1.14.287-1.681"
          }
        ></path>
      </g>
    </svg>
  );
}

export default IconIcon;
/* prettier-ignore-end */
