import * as React from "react";
import {
  PlasmicMainPageReservation,
  DefaultMainPageReservationProps
} from "./plasmic/sayban/PlasmicMainPageReservation";
import { HTMLElementRefOf } from "@plasmicapp/react-web";

export interface MainPageReservationProps
  extends DefaultMainPageReservationProps {}

function MainPageReservation_(
  props: MainPageReservationProps,
  ref: HTMLElementRefOf<"div">
) {
  const setPageRef = React.useRef<((page: number) => void) | null>(null);

  return (
    <PlasmicMainPageReservation
      root={{ ref }}
      {...props}
      overrides={{
        textInput: {
          render: (renderProps: any, DefaultTextInput: any) => (
            <DefaultTextInput
              {...renderProps}
              ariaInputOnBlur={async (event: any) => {
                await renderProps.ariaInputOnBlur?.(event);
                setPageRef.current?.(1);
              }}
            />
          )
        },
        pagination: {
          render: (renderProps: any, DefaultPagination: any) => {
            setPageRef.current = (page: number) => {
              renderProps.onPageChange?.(page);
            };
            return <DefaultPagination {...renderProps} />;
          }
        },
        button2: {
          render: (renderProps: any, DefaultButton: any) => (
            <DefaultButton
              {...renderProps}
              onClick={async (event: any) => {
                setPageRef.current?.(1);
                await renderProps.onClick?.(event);
              }}
            />
          )
        }
      }}
    />
  );
}

const MainPageReservation = React.forwardRef(MainPageReservation_);
export default MainPageReservation;
