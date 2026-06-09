/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon45IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon45Icon(props: Icon45IconProps) {
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
          "M128 28a100.026 100.026 0 0 0-86.885 149.54l-9.005 31.516a12 12 0 0 0 14.835 14.834l31.517-9.004A100.007 100.007 0 1 0 128 28m0 192a91.87 91.87 0 0 1-46.952-12.867 4 4 0 0 0-3.144-.408l-33.157 9.473a4 4 0 0 1-4.944-4.945l9.472-33.156a4 4 0 0 0-.408-3.144A92.01 92.01 0 1 1 128 220m50.512-73.457-20.46-11.691a12.01 12.01 0 0 0-12.127.129l-13.807 8.284a44.04 44.04 0 0 1-19.382-19.383l8.284-13.807a12.01 12.01 0 0 0 .128-12.127l-11.69-20.46A10.92 10.92 0 0 0 100 72a32.01 32.01 0 0 0-32 31.88A84 84 0 0 0 151.999 188h.12A32.01 32.01 0 0 0 184 156a10.91 10.91 0 0 0-5.488-9.457M152.108 180H152a76 76 0 0 1-76-76.107A23.997 23.997 0 0 1 100 80a2.9 2.9 0 0 1 2.512 1.457l11.69 20.461a4 4 0 0 1-.042 4.042l-9.39 15.648a4 4 0 0 0-.218 3.699 52.04 52.04 0 0 0 26.142 26.141 4 4 0 0 0 3.699-.218l15.647-9.39a4 4 0 0 1 4.043-.043l20.46 11.692A2.9 2.9 0 0 1 176 156a23.997 23.997 0 0 1-23.892 24"
        }
      ></path>
    </svg>
  );
}

export default Icon45Icon;
/* prettier-ignore-end */
