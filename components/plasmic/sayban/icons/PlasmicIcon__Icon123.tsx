/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon123IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon123Icon(props: Icon123IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 48 48"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <g fill={"currentColor"} fillRule={"evenodd"} clipRule={"evenodd"}>
        <path
          d={
            "M16.879 28.358c1.726-.424 5.128 3.404 6.655 5.123.185.208.342.385.466.52.178-.183.424-.451.719-.773 1.643-1.794 4.818-5.26 6.402-4.87C36.526 29.686 42 32.394 42 36.468V43H6v-6.534c0-4.073 5.475-6.781 10.879-8.11M34 35h2v2h-2v2h-2v-2h-2v-2h2v-2h2zM16.609 4.39C18.473 3.801 21.465 3 24 3s5.527.802 7.391 1.39c1.651.52 2.403 2.318 1.787 3.858l-2.25 6.623a1 1 0 0 1-1.28.565c-3.773-1.415-7.523-1.415-11.297 0a1 1 0 0 1-1.28-.565l-2.249-6.623c-.616-1.54.136-3.339 1.787-3.859M25 8h2v2h-2v2h-2v-2h-2V8h2V6h2z"
          }
        ></path>

        <path
          d={"M19.37 13.75a7 7 0 1 0 9.26 0l1.323-1.5a9 9 0 1 1-11.907 0z"}
        ></path>
      </g>
    </svg>
  );
}

export default Icon123Icon;
/* prettier-ignore-end */
