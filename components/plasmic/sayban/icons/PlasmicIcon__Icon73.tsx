/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon73IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon73Icon(props: Icon73IconProps) {
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
          "M12 2C9.218 2 6.963 4.175 6.963 6.857S9.218 11.714 12 11.714s5.037-2.174 5.037-4.857C17.037 4.175 14.782 2 12 2m2.973 11.875a19.6 19.6 0 0 0-5.946 0l-.21.033C6.041 14.335 4 16.643 4 19.352 4 20.814 5.23 22 6.746 22h10.508C18.771 22 20 20.814 20 19.352c0-2.71-2.042-5.017-4.816-5.444z"
        }
      ></path>
    </svg>
  );
}

export default Icon73Icon;
/* prettier-ignore-end */
