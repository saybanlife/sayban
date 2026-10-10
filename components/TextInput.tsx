import * as React from "react";
import {
  PlasmicTextInput,
  DefaultTextInputProps
} from "./plasmic/sayban/PlasmicTextInput";
import {
  getFieldRules,
  getNationalIdError,
  sanitizeFieldValue
} from "./formFieldRules";

export interface TextInputProps extends DefaultTextInputProps {}

function TextInput(props: TextInputProps) {
  const rules = getFieldRules({
    inputType: props.inputType,
    inputMode: props.inputMode,
    placeholder: props.placeholder,
    autoComplete: props.autoComplete,
    ariaLabel: props.ariaLabel
  });
  const maxLength = props.maxLength ?? rules.maxLength;
  const value = String(props.value ?? "");
  const nationalIdError =
    rules.kind === "nationalId" ? getNationalIdError(value, false) : undefined;
  const showNationalIdError = Boolean(
    rules.kind === "nationalId" && value.length >= 10 && nationalIdError
  );

  return (
    <PlasmicTextInput
      {...props}
      autoComplete={
        props.autoComplete ?? (rules.autoComplete as TextInputProps["autoComplete"])
      }
      error={
        props.error === "error" || showNationalIdError ? "error" : props.error
      }
      inputMode={props.inputMode ?? rules.inputMode}
      inputType={props.inputType ?? rules.inputType}
      maxLength={maxLength}
      minLength={props.minLength ?? rules.minLength}
      pattern={props.pattern ?? rules.pattern}
      placeholder={rules.placeholder}
      ariaLabel={
        showNationalIdError
          ? nationalIdError
          : props.ariaLabel || rules.title || props.ariaLabel
      }
      onChange={nextValue => {
        const next = sanitizeFieldValue(
          rules.kind,
          String(nextValue ?? ""),
          maxLength
        );
        props.onChange?.(next);
      }}
    />
  );
}

export default TextInput;
