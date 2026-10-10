import * as React from "react";
import {
  PlasmicAnswersUser,
  DefaultAnswersUserProps
} from "./plasmic/sayban/PlasmicAnswersUser";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import TextInput from "./TextInput";
import {
  getNationalIdError,
  sanitizeFieldValue
} from "./formFieldRules";

export interface AnswersUserProps extends DefaultAnswersUserProps {}

function isNationalIdQuestion(questionText: unknown): boolean {
  return /کد\s*ملی/.test(String(questionText || ""));
}

function AnswersUser_(props: AnswersUserProps, ref: HTMLElementRefOf<"div">) {
  const item = props.currentItem as
    | { type?: string; question_text?: string; is_required?: boolean }
    | undefined;
  const isText = item?.type === "text";
  const isNationalId = isNationalIdQuestion(item?.question_text);
  const [localValue, setLocalValue] = React.useState(
    typeof props.answers === "string" ? props.answers : ""
  );
  const [error, setError] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (typeof props.answers === "string") {
      setLocalValue(props.answers);
    }
  }, [props.answers]);

  if (!isText) {
    return <PlasmicAnswersUser root={{ ref }} {...props} />;
  }

  return (
    <div ref={ref} style={{ width: "100%", display: "grid", gap: "0.5rem" }}>
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          alignItems: "center",
          justifyContent: "flex-start"
        }}
      >
        <div>{item?.question_text}</div>
        {item?.is_required ? <div style={{ color: "#c62828" }}>*</div> : null}
      </div>
      <TextInput
        ariaLabel={item?.question_text || (isNationalId ? "کد ملی" : "پاسخ")}
        error={error ? "error" : undefined}
        inputMode={isNationalId ? "numeric" : undefined}
        maxLength={isNationalId ? 10 : 200}
        minLength={isNationalId ? 10 : undefined}
        pattern={isNationalId ? "^\\d{10}$" : undefined}
        placeholder={isNationalId ? "کد ملی" : "پاسخ خود را وارد کنید"}
        type="lineBoxDark"
        value={localValue}
        onChange={value => {
          const next = isNationalId
            ? sanitizeFieldValue("nationalId", String(value ?? ""), 10)
            : String(value ?? "");
          setLocalValue(next);
          props.onAnswersChange?.(next);
          if (isNationalId) {
            const err =
              next.length === 10
                ? getNationalIdError(next, true)
                : next.length > 0
                  ? "کد ملی باید ۱۰ رقم باشد"
                  : undefined;
            setError(err);
          } else {
            setError(undefined);
          }
        }}
      />
      {error ? (
        <div style={{ color: "#c62828", fontSize: "0.8125rem" }}>{error}</div>
      ) : null}
    </div>
  );
}

const AnswersUser = React.forwardRef(AnswersUser_);
export default AnswersUser;
