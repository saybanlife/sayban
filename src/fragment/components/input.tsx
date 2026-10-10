/* eslint-disable react/display-name */
import { CodeComponentMeta, useSelector } from "@plasmicapp/host";
import * as InputPrimitive from "@/components/ui/input";
import { HTMLInputTypeAttribute, RefAttributes } from "react";
import {
  getFieldRules,
  sanitizeFieldValue
} from "../../../components/formFieldRules";

type InputType = {
  placeholder?: string;
  onChange?: (value: string) => void;
  value?: any;
  disabled?: boolean;
  className?: string;
  name?: string;
  type?: HTMLInputTypeAttribute;
  attributes?: InputPrimitive.InputProps & RefAttributes<HTMLInputElement>;
  multiple?: boolean;
  accept?: string;
};

export const Input = (props: InputType) => {
  const {
    placeholder,
    value,
    onChange,
    disabled,
    className,
    name,
    type = "text",
    attributes,
    multiple,
    accept,
  } = props;
  const fragmentConfig = useSelector("Fragment");
  const skipConstraints =
    type === "file" ||
    type === "hidden" ||
    type === "date" ||
    type === "datetime-local" ||
    type === "time";
  const rules = skipConstraints
    ? null
    : getFieldRules({ type, placeholder, name });
  const maxLength = attributes?.maxLength ?? rules?.maxLength;
  return (
    <InputPrimitive.Input
      disabled={disabled}
      onChange={(e) =>
        onChange?.(
          rules
            ? sanitizeFieldValue(rules.kind, e.target?.value ?? "", maxLength)
            : e.target?.value ?? ""
        )
      }
      value={value}
      dir={type !== "text" ? "ltr" : fragmentConfig.rtl ? "rtl" : "ltr"}
      name={name}
      placeholder={rules ? rules.placeholder : placeholder}
      className={className}
      type={type}
      inputMode={attributes?.inputMode ?? rules?.inputMode}
      maxLength={maxLength}
      pattern={attributes?.pattern ?? rules?.pattern}
      title={attributes?.title ?? rules?.title}
      autoComplete={attributes?.autoComplete ?? rules?.autoComplete}
      {...(type == "file" && {
        multiple,
        accept,
      })}
      {...attributes}
    />
  );
};

export const inputMeta: CodeComponentMeta<InputType> = {
  name: "Input",
  displayName: "Fragment/Input",
  importPath: "@/fragment/components/input",
  figmaMappings: [{ figmaComponentName: "Input" }],
  props: {
    placeholder: "string",
    value: {
      type: "string",
      defaultValue: "",
    },
    type: {
      type: "choice",
      options: [
        "text",
        "password",
        "hidden",
        "number",
        "date",
        "datetime-local",
        "time",
        "email",
        "tel",
        "file",
      ],
      defaultValue: "text",
      defaultValueHint: "text",
    },
    disabled: "boolean",
    multiple: {
      type: "boolean",
      hidden: (ps) => ps.type != "file",
    },
    accept: {
      type: "string",
      hidden: (ps) => ps.type != "file",
    },
    name: {
      type: "string",
      advanced: true,
      description: "The HTML name of the input",
    },
    attributes: {
      type: "object",
      advanced: true,
    },
    onChange: {
      type: "eventHandler",
      argTypes: [{ name: "value", type: "string" }],
    },
  },
  classNameProp: "className",
  defaultStyles: {
    width: "stretch",
  },
  states: {
    value: {
      type: "writable",
      variableType: "text",
      valueProp: "value",
      onChangeProp: "onChange",
    },
  },
};
