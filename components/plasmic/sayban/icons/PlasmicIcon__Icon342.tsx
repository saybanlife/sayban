/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon342IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon342Icon(props: Icon342IconProps) {
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
          "M12 15h.01M12 12V9M4.982 19h14.036c1.543 0 2.505-1.674 1.727-3.008l-7.017-12.03c-.772-1.323-2.684-1.323-3.456 0l-7.017 12.03C2.477 17.326 3.438 19 4.982 19"
        }
      ></path>
    </svg>
  );
}

export default Icon342Icon;
/* prettier-ignore-end */
