import * as React from "react";
import {
  PlasmicTextInput2,
  DefaultTextInput2Props
} from "./plasmic/sayban/PlasmicTextInput2";

import { TextInputRef } from "@plasmicapp/react-web";
import { getFieldRules, sanitizeFieldValue } from "./formFieldRules";

export interface TextInput2Props extends DefaultTextInput2Props {}

function TextInput2_(props: TextInput2Props, ref: TextInputRef) {
  const rules = getFieldRules({
    type: props.type,
    placeholder: props.placeholder,
    name: props.name,
    ariaLabel: props["aria-label"]
  });
  const maxLength = rules.maxLength;
  const placeholder =
    props.placeholder && !/enter something/i.test(props.placeholder)
      ? rules.placeholder
      : rules.placeholder;

  const { plasmicProps } = PlasmicTextInput2.useBehavior<TextInput2Props>(
    {
      ...props,
      placeholder,
      type: props.type ?? (rules.inputType as TextInput2Props["type"]),
      maxLength: props.maxLength ?? maxLength,
      onChange: event => {
        const isEvent = event && typeof event === "object" && "target" in event;
        const raw = isEvent
          ? String((event as { target?: { value?: string } }).target?.value ?? "")
          : String(event ?? "");
        const next = sanitizeFieldValue(rules.kind, raw, maxLength);
        if (isEvent && (event as { target?: { value?: string } }).target) {
          (event as { target: { value: string } }).target.value = next;
        }
        props.onChange?.(isEvent ? event : next);
      }
    },
    ref
  );
  return <PlasmicTextInput2 {...plasmicProps} />;
}

const TextInput2 = React.forwardRef(TextInput2_);

export default Object.assign(TextInput2, {
  __plumeType: "text-input"
});
