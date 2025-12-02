/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon331IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon331Icon(props: Icon331IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      xmlnsXlink={"http://www.w3.org/1999/xlink"}
      fill={"none"}
      viewBox={"0 0 24 24"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <g fill={"#747474"} clipPath={"url(#a)"}>
        <path
          d={
            "M16.5 1c-1.737 0-3.37.676-4.596 1.904l-9 9A6.46 6.46 0 0 0 1 16.5C1 20.084 3.916 23 7.5 23c1.737 0 3.37-.676 4.596-1.904l9-9A6.46 6.46 0 0 0 23 7.5C23 3.916 20.084 1 16.5 1m-5.111 19.39A5.46 5.46 0 0 1 7.5 22 5.506 5.506 0 0 1 2 16.5c0-1.469.572-2.85 1.611-3.89l4.147-4.146 7.777 7.779zm9-9-4.147 4.146-7.777-7.779 4.146-4.146A5.46 5.46 0 0 1 16.5 2C19.532 2 22 4.467 22 7.5c0 1.47-.572 2.85-1.611 3.89"
          }
        ></path>

        <path
          fillRule={"evenodd"}
          d={
            "M11.55 2.55A6.95 6.95 0 0 1 16.5.5c3.86 0 7 3.14 7 7a6.96 6.96 0 0 1-2.05 4.95l-9 9A6.95 6.95 0 0 1 7.5 23.5c-3.86 0-7-3.14-7-7a6.96 6.96 0 0 1 2.05-4.95zm4.95-.05c-1.337 0-2.59.52-3.535 1.464L9.172 7.757l7.07 7.072 3.793-3.793A4.97 4.97 0 0 0 21.5 7.5c0-2.757-2.244-5-5-5M7.758 9.171l-3.793 3.793A4.96 4.96 0 0 0 2.5 16.5c0 2.756 2.244 5 5 5 1.337 0 2.59-.52 3.535-1.464l3.793-3.793z"
          }
          clipRule={"evenodd"}
        ></path>

        <path
          d={
            "m7.34 12.129-2.32 2.636C4.362 15.51 4 16.505 4 17.56c0 .242.173.439.387.439.213 0 .386-.197.386-.44 0-.82.282-1.593.793-2.174l2.32-2.636a.48.48 0 0 0 0-.621.355.355 0 0 0-.546 0"
          }
        ></path>

        <path
          fillRule={"evenodd"}
          d={
            "M6.965 11.798a.854.854 0 0 1 1.297 0 .98.98 0 0 1 0 1.282l-2.32 2.636c-.426.484-.669 1.137-.669 1.845 0 .457-.338.939-.886.939s-.887-.482-.887-.94c0-1.17.4-2.282 1.144-3.126z"
          }
          clipRule={"evenodd"}
        ></path>
      </g>

      <defs>
        <clipPath id={"a"}>
          <path fill={"#fff"} d={"M0 0h24v24H0z"}></path>
        </clipPath>
      </defs>
    </svg>
  );
}

export default Icon331Icon;
/* prettier-ignore-end */
