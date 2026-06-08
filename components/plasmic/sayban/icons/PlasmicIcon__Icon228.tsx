/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon228IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon228Icon(props: Icon228IconProps) {
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

      <mask
        id={"CurhVH8RV0P_a"}
        style={{
          maskType: 'alpha"'
        }}
        maskUnits={"userSpaceOnUse"}
        x={"0"}
        y={"0"}
        width={"24"}
        height={"24"}
      >
        <path fill={"#D9D9D9"} d={"M0 0h24v24H0z"}></path>
      </mask>

      <g mask={"url(#CurhVH8RV0P_a)"}>
        <path
          d={
            "M12 13.05l-5.075 5.075a.736.736 0 01-.512.212.69.69 0 01-.538-.212.72.72 0 01-.225-.525c0-.2.075-.375.225-.525L10.95 12 5.875 6.925a.737.737 0 01-.212-.513.69.69 0 01.212-.537.72.72 0 01.525-.225c.2 0 .375.075.525.225L12 10.95l5.075-5.075a.74.74 0 01.513-.213.693.693 0 01.537.213.72.72 0 01.225.525.72.72 0 01-.225.525L13.05 12l5.075 5.075a.736.736 0 01.212.512.69.69 0 01-.212.538.72.72 0 01-.525.225.72.72 0 01-.525-.225L12 13.05z"
          }
          fill={"#280056"}
        ></path>
      </g>
    </svg>
  );
}

export default Icon228Icon;
/* prettier-ignore-end */
