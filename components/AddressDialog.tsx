import * as React from "react";
import { useRouter } from "next/router";
import {
  PlasmicAddressDialog,
  DefaultAddressDialogProps
} from "./plasmic/sayban/PlasmicAddressDialog";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import {
  buildAddAddressDestination,
  isAddAddressRoute,
  rememberAddressDialogReturn
} from "./address/addressDialogFlow";

export interface AddressDialogProps extends DefaultAddressDialogProps {}

function AddressDialog_(
  props: AddressDialogProps,
  ref: HTMLElementRefOf<"div">
) {
  const router = useRouter();
  const closeDialogRef = React.useRef<(() => void) | null>(null);
  const navigatingRef = React.useRef(false);

  const pageBase =
    typeof router.query.page === "string" && router.query.page
      ? router.query.page
      : "home";

  const goAddAddress = React.useCallback(async () => {
    if (navigatingRef.current) return;
    if (isAddAddressRoute(router.asPath)) return;

    navigatingRef.current = true;
    try {
      rememberAddressDialogReturn(router.asPath);
      const destination = buildAddAddressDestination(pageBase, router.asPath);
      await router.push(destination);
      closeDialogRef.current?.();
    } finally {
      window.setTimeout(() => {
        navigatingRef.current = false;
      }, 400);
    }
  }, [pageBase, router]);

  const bindAddAddressButton = React.useCallback(
    (renderProps: { onClick?: (...args: unknown[]) => unknown }) => ({
      ...renderProps,
      onClick: async () => {
        await goAddAddress();
      }
    }),
    [goAddAddress]
  );

  return (
    <PlasmicAddressDialog
      root={{ ref }}
      {...props}
      addUser={goAddAddress}
      overrides={{
        dialog: {
          render: (renderProps, DefaultDialog) => {
            closeDialogRef.current = () => {
              (renderProps.onOpendialogChange as ((open: boolean) => void) | undefined)?.(
                false
              );
            };
            return <DefaultDialog {...renderProps} />;
          }
        },
        button: {
          render: (renderProps, DefaultButton) => (
            <DefaultButton {...bindAddAddressButton(renderProps)} />
          )
        },
        button2: {
          render: (renderProps, DefaultButton) => (
            <DefaultButton {...bindAddAddressButton(renderProps)} />
          )
        }
      }}
    />
  );
}

const AddressDialog = React.forwardRef(AddressDialog_);
export default AddressDialog;
