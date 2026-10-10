import * as React from "react";
import {
  PlasmicPatient,
  DefaultPatientProps
} from "./plasmic/sayban/PlasmicPatient";
import { HTMLElementRefOf, PlasmicImg } from "@plasmicapp/react-web";
import Button from "./Button";
import Icon56Icon from "./plasmic/sayban/icons/PlasmicIcon__Icon56";
import patientSty from "./plasmic/sayban/PlasmicPatient.module.css";
import { PatientListBody } from "./user/PatientAddressListBody";

export interface PatientProps extends DefaultPatientProps {}

function PatientEmptyState({ onAdd }: { onAdd?: () => void }) {
  return (
    <div className={patientSty.freeBox__rgkJ}>
      <PlasmicImg
        alt=""
        className={patientSty.img}
        displayHeight="auto"
        displayMaxHeight="none"
        displayMaxWidth="100%"
        displayMinHeight="0"
        displayMinWidth="0"
        displayWidth="30%"
        loading="lazy"
        src={{
          src: "/plasmic/sayban/images/image30.svg",
          fullWidth: 280,
          fullHeight: 280,
          aspectRatio: undefined
        }}
      />
      <div className={patientSty.text__x6TnN}>هنوز همراهی اضافه نکرده‌اید</div>
      <div className={patientSty.text__nwqss}>
        با افزودن همراهان، می‌توانید سریع‌تر برای آن‌ها نوبت رزرو کنید.
      </div>
      <Button
        className={patientSty.button}
        color="success"
        iconStart
        label={<div className={patientSty.text__iqd0Q}>افزودن همراه</div>}
        onClick={() => onAdd?.()}
        start={<Icon56Icon className={patientSty.svg___76Ylg} role="img" />}
      />
    </div>
  );
}

function Patient_(props: PatientProps, ref: HTMLElementRefOf<"div">) {
  const [payload, setPayload] = React.useState<unknown>(null);

  const bumpRefresh = React.useCallback(() => {
    props.onRefreshChange?.(Date.now().toString());
  }, [props.onRefreshChange]);

  return (
    <PlasmicPatient
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
              <PatientListBody
                payload={payload}
                onRefresh={bumpRefresh}
                emptyState={
                  <PatientEmptyState onAdd={props.addUser} />
                }
              />
            </DefaultApiRequest>
          )
        }
      }}
    />
  );
}

const Patient = React.forwardRef(Patient_);
export default Patient;
