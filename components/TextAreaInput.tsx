import * as React from "react";
import {
  PlasmicTextAreaInput,
  DefaultTextAreaInputProps
} from "./plasmic/sayban/PlasmicTextAreaInput";
import { improvePlaceholder, sanitizeFieldValue } from "./formFieldRules";

export interface TextAreaInputProps extends DefaultTextAreaInputProps {}

const TEXTAREA_MAX_LENGTH = 2000;

function TextAreaInput(props: TextAreaInputProps) {
  return (
    <PlasmicTextAreaInput
      {...props}
      placeholder={improvePlaceholder(props.placeholder, "description")}
      onChange={value => {
        const next = sanitizeFieldValue(
          "description",
          String(value ?? ""),
          TEXTAREA_MAX_LENGTH
        );
        props.onChange?.(next);
      }}
    />
  );
}

export default TextAreaInput;
