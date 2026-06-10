/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon3IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon3Icon(props: Icon3IconProps) {
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
        fillRule={"evenodd"}
        d={
          "M5.274 10.126C5 10.723 5 11.402 5 12.76V17c0 1.887 0 2.83.586 3.415.531.532 1.357.58 2.914.585v-5a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v5c1.557-.005 2.383-.054 2.914-.586C19 19.828 19 18.886 19 17v-4.24c0-1.358 0-2.037-.274-2.634-.275-.597-.79-1.038-1.821-1.922l-1-.857C14.04 5.75 13.11 4.95 12 4.95s-2.041.799-3.905 2.396l-1 .857c-1.03.884-1.546 1.325-1.82 1.922M13.5 21v-5h-3v5z"
        }
        clipRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default Icon3Icon;
/* prettier-ignore-end */
