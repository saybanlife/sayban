/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */
import React from "react";
import { classNames } from "@plasmicapp/react-web";

export type Icon43IconProps = React.ComponentProps<"svg"> & {
  title?: string;
};

export function Icon43Icon(props: Icon43IconProps) {
  const { className, style, title, ...restProps } = props;
  return (
    <svg
      xmlns={"http://www.w3.org/2000/svg"}
      fill={"none"}
      viewBox={"0 0 180 180"}
      height={"1em"}
      className={classNames("plasmic-default__svg", className)}
      style={style}
      {...restProps}
    >
      {title && <title>{title}</title>}

      <ellipse
        cx={"90"}
        cy={"174.598"}
        fill={"currentColor"}
        opacity={".1"}
        rx={"90"}
        ry={"5.4"}
      ></ellipse>

      <path
        fill={"currentColor"}
        fillRule={"evenodd"}
        d={
          "M137.58 27.3a4.742 4.742 0 1 0-9.484 0v9.755a4.742 4.742 0 1 0 9.484 0zm-4.742-1.143c.631 0 1.142.512 1.142 1.142v9.756a1.142 1.142 0 1 1-2.284 0v-9.756c0-.63.511-1.142 1.142-1.142M18 61.2C18 52.253 25.253 45 34.2 45H117c8.947 0 16.2 7.253 16.2 16.2v14.4h14.4c6.959 0 12.6 5.641 12.6 12.6v44.64c0 6.959-5.641 12.6-12.6 12.6h-4.691v6.521c0 4.711-5.612 7.163-9.069 3.963l-11.324-10.484H73.8c-6.959 0-12.6-5.641-12.6-12.6v-5.689l-13.888 12.962c-3.452 3.222-9.084.774-9.084-3.948v-9.445H34.2c-8.947 0-16.2-7.253-16.2-16.2zm115.2 49.32V79.2h14.4a9 9 0 0 1 9 9v44.64a9 9 0 0 1-9 9h-6.491a1.8 1.8 0 0 0-1.8 1.8v8.321c0 1.57-1.871 2.388-3.023 1.321l-11.842-10.963a1.8 1.8 0 0 0-1.223-.479H73.8a9 9 0 0 1-9-9v-6.12H117c8.947 0 16.2-7.253 16.2-16.2m-16.2 12.6H60.952a1.8 1.8 0 0 0-1.228.484L44.856 137.48c-1.15 1.074-3.029.258-3.029-1.316v-11.245a1.8 1.8 0 0 0-1.8-1.8H34.2c-6.959 0-12.6-5.641-12.6-12.6v-49.32c0-6.959 5.641-12.6 12.6-12.6H117c6.959 0 12.6 5.641 12.6 12.6v49.32c0 6.959-5.641 12.6-12.6 12.6m-67.905-28.89a8.37 8.37 0 1 0 0-16.74 8.37 8.37 0 0 0 0 16.74m34.874-8.37a8.37 8.37 0 1 1-16.74 0 8.37 8.37 0 0 1 16.74 0m18.136 8.37a8.37 8.37 0 0 0 8.37-8.37 8.37 8.37 0 1 0-16.74 0 8.37 8.37 0 0 0 8.37 8.37m35.314-46.797a4.74 4.74 0 0 0 4.742 4.742h9.756a4.742 4.742 0 0 0 0-9.484h-9.756a4.74 4.74 0 0 0-4.742 4.742m4.742 1.142a1.142 1.142 0 1 1 0-2.284h9.756a1.142 1.142 0 1 1 0 2.284z"
        }
        clipRule={"evenodd"}
      ></path>
    </svg>
  );
}

export default Icon43Icon;
/* prettier-ignore-end */
