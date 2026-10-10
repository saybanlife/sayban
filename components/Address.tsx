import * as React from "react";
import {
  PlasmicAddress,
  DefaultAddressProps
} from "./plasmic/sayban/PlasmicAddress";
import { HTMLElementRefOf, PlasmicImg } from "@plasmicapp/react-web";
import Button from "./Button";
import Icon56Icon from "./plasmic/sayban/icons/PlasmicIcon__Icon56";
import addressSty from "./plasmic/sayban/PlasmicAddress.module.css";
import { AddressListBody } from "./user/PatientAddressListBody";

export interface AddressProps extends DefaultAddressProps {}

function AddressEmptyState({ onAdd }: { onAdd?: () => void }) {
  return (
    <div className={addressSty.freeBox__wEuN}>
      <PlasmicImg
        alt=""
        className={addressSty.img}
        displayHeight="auto"
        displayMaxHeight="none"
        displayMaxWidth="100%"
        displayMinHeight="0"
        displayMinWidth="0"
        displayWidth="30%"
        loading="lazy"
        src={{
          src: "/plasmic/sayban/images/image35.svg",
          fullWidth: 280,
          fullHeight: 280,
          aspectRatio: undefined
        }}
      />
      <div className={addressSty.text__e9Hoj}>هنوز آدرسی اضافه نکرده‌اید</div>
      <div className={addressSty.text___18Pu4}>
        با افزودن آدرس، می‌توانید سریع‌تر برای آن‌ها نوبت رزرو کنید.
      </div>
      <Button
        className={addressSty.button}
        color="success"
        iconStart
        label={<div className={addressSty.text___70P9}>افزودن آدرس</div>}
        onClick={() => onAdd?.()}
        start={<Icon56Icon className={addressSty.svg__um5Qg} role="img" />}
      />
    </div>
  );
}

function Address_(props: AddressProps, ref: HTMLElementRefOf<"div">) {
  const [payload, setPayload] = React.useState<unknown>(null);

  const bumpRefresh = React.useCallback(() => {
    props.onRefreshChange?.(Date.now().toString());
  }, [props.onRefreshChange]);

  return (
    <PlasmicAddress
      root={{ ref }}
      {...props}
      overrides={{
        apiRequest: {
          render: (renderProps, DefaultApiRequest) => (
            <DefaultApiRequest
              {...renderProps}
              onSuccess={(data: unknown) => {
                setPayload(data);
                renderProps.onSuccess?.(data);
              }}
            >
              <AddressListBody
                payload={payload}
                onRefresh={bumpRefresh}
                emptyState={<AddressEmptyState onAdd={props.addUser} />}
              />
            </DefaultApiRequest>
          )
        }
      }}
    />
  );
}

const Address = React.forwardRef(Address_);
export default Address;
