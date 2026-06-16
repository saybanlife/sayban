import * as React from "react";
import {
  PlasmicCheckbox2,
  DefaultCheckbox2Props
} from "./plasmic/sayban/PlasmicCheckbox2";

import { CheckboxRef } from "@plasmicapp/react-web";

export interface Checkbox2Props extends DefaultCheckbox2Props {
  // Feel free to add any additional props that this component should receive
}
function Checkbox2_(props: Checkbox2Props, ref: CheckboxRef) {
  const { plasmicProps, state } = PlasmicCheckbox2.useBehavior<Checkbox2Props>(
    props,
    ref
  );
  return <PlasmicCheckbox2 {...plasmicProps} />;
}

const Checkbox2 = React.forwardRef(Checkbox2_);

export default Object.assign(
  Checkbox2,

  {
    __plumeType: "checkbox",
    __plasmicFormFieldMeta: { valueProp: "isChecked" }
  }
);
