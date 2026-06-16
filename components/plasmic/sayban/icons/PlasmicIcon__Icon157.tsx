/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon157IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon157Icon(props: Icon157IconProps) {
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
        d={
          "M21.349 16.182l-6.13-11.737C14.394 2.866 13.254 2 12 2s-2.395.866-3.218 2.445l-6.13 11.737c-.777 1.498-.863 2.935-.24 4.066C3.034 21.378 4.26 22 5.87 22h12.26c1.61 0 2.836-.622 3.458-1.752.623-1.131.537-2.578-.24-4.066zm-10.067-7.05c0-.418.325-.764.718-.764.393 0 .718.346.718.764v5.094c0 .418-.325.764-.718.764-.393 0-.718-.346-.718-.764V9.132zm1.398 8.874l-.144.122a.712.712 0 01-.172.092.556.556 0 01-.182.061c-.058.01-.125.02-.182.02-.057 0-.124-.01-.192-.02a.587.587 0 01-.172-.06.712.712 0 01-.172-.093l-.144-.122a1.108 1.108 0 01-.278-.723c0-.265.106-.53.278-.724l.144-.122a.708.708 0 01.172-.092.581.581 0 01.172-.06.771.771 0 01.374 0c.067.01.124.03.182.06.057.02.115.051.172.092l.144.122c.172.194.278.459.278.724 0 .265-.106.53-.278.723z"
        }
        fill={"currentColor"}
      ></path>
    </svg>
  );
}

export default Icon157Icon;
/* prettier-ignore-end */
