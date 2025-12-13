/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon48IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon48Icon(props: Icon48IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"#000"}
      className={classNames("plasmic-default__svg", className, "icon")}
      version={"1.1"}
      viewBox={"0 0 1024 1024"}
      height={"1em"}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <path
        fill={"#248CBE"}
        d={
          "M617.1 671.2H148.2c-46.3 0-83.9-37.6-83.9-83.9v-307c0-46.3 37.6-83.9 83.9-83.9h468.9c46.3 0 83.9 37.6 83.9 83.9v306.9c0 46.4-37.5 84-83.9 84"
        }
      ></path>

      <path fill={"#183351"} d={"M64.3 302.3h636.8v96.1H64.3z"}></path>

      <path
        fill={"#FBFAEE"}
        d={
          "M304 531.8H128.3c-12.1 0-22-9.9-22-22s9.9-22 22-22H304c12.1 0 22 9.9 22 22s-9.9 22-22 22m133.4 69.4H128.3c-12.1 0-22-9.9-22-22s9.9-22 22-22h309.1c12.1 0 22 9.9 22 22s-9.9 22-22 22"
        }
      ></path>

      <path
        fill={"#F5DB6F"}
        d={
          "M875.8 827.6H406.9c-46.3 0-83.9-37.6-83.9-83.9v-307c0-46.3 37.6-83.9 83.9-83.9h468.9c46.3 0 83.9 37.6 83.9 83.9v306.9c0 46.4-37.5 84-83.9 84"
        }
      ></path>

      <path
        fill={"#AEB8C4"}
        d={
          "M788.3 607.2H387c-12.1 0-22-9.9-22-22s9.9-22 22-22h401.3c12.1 0 22 9.9 22 22s-9.9 22-22 22"
        }
      ></path>

      <path
        fill={"#FBFAEE"}
        d={
          "M562.7 688.2H387c-12.1 0-22-9.9-22-22s9.9-22 22-22h175.8c12.1 0 22 9.9 22 22-.1 12.1-10 22-22.1 22m133.4 69.4H387c-12.1 0-22-9.9-22-22s9.9-22 22-22h309.1c12.1 0 22 9.9 22 22s-9.9 22-22 22"
        }
      ></path>

      <path
        fill={"#F3C262"}
        d={
          "M510.4 520.3H401.8c-20.3 0-36.8-16.5-36.8-36.8v-50.8c0-20.3 16.5-36.8 36.8-36.8h108.6c20.3 0 36.8 16.5 36.8 36.8v50.8c0 20.3-16.5 36.8-36.8 36.8"
        }
      ></path>

      <path
        fill={"#F7A04D"}
        d={
          "M547.2 438.1h-34.3v-42.2H479v124.4h33.9v-47.7h34.3zm-144.6-42.2v42.2H365v34.5h37.6v47.7h33.9V395.9z"
        }
      ></path>

      <path
        fill={"#F7F9DD"}
        d={
          "M959.7 577.8V484c-80.6-.3-148.2-56.4-166.1-131.6h-95.5c19.2 127.2 129.2 225.1 261.6 225.4"
        }
      ></path>
    </svg>
  );
}

export default Icon48Icon;
/* prettier-ignore-end */
