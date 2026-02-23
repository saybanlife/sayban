/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon84IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon84Icon(props: Icon84IconProps) {
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
          "M12 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4m0 0v3m8-3.5c0 4.461-5.46 7.694-7.359 8.683-.205.107-.308.16-.45.188a1.1 1.1 0 0 1-.382 0c-.142-.027-.245-.081-.45-.188C9.46 19.693 4 16.461 4 12V8.218c0-.8 0-1.2.13-1.543a2 2 0 0 1 .548-.79c.276-.243.65-.383 1.398-.664l5.362-2.01c.208-.078.312-.117.419-.133a1 1 0 0 1 .286 0c.107.016.21.055.419.133l5.362 2.01c.748.281 1.123.421 1.398.665a2 2 0 0 1 .547.789c.131.343.131.743.131 1.543z"
        }
      ></path>
    </svg>
  );
}

export default Icon84Icon;
/* prettier-ignore-end */
