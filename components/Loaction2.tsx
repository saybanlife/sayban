import * as React from "react";
import {
  PlasmicLoaction2,
  DefaultLoaction2Props
} from "./plasmic/sayban/PlasmicLoaction2";
import { HTMLElementRefOf } from "@plasmicapp/react-web";

export interface Loaction2Props extends DefaultLoaction2Props {}

function Loaction2_(props: Loaction2Props, ref: HTMLElementRefOf<"div">) {
  return (
    <PlasmicLoaction2
      root={{ ref }}
      {...props}
      overrides={{
        postalCode: {
          props: {
            autoComplete: "postal-code",
            inputMode: "numeric",
            maxLength: 10,
            minLength: 10,
            pattern: "^\\d{10}$",
            placeholder: "کد پستی"
          }
        }
      }}
    />
  );
}

const Loaction2 = React.forwardRef(Loaction2_);
export default Loaction2;
