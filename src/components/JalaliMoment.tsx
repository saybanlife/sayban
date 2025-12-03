import React from "react";
import moment from "jalali-moment";
import { classNames } from "@plasmicapp/react-web";
import { CodeComponentMeta } from "@plasmicapp/host";

type JalaliMomentProps = {
  date?: string;        
  format?: string;      
  action?: string;      
  amount?: number;      
  unit?: moment.unitOfTime.DurationConstructor; // <-- fix here
  className?: string;   
};

export const JalaliMoment = (props: JalaliMomentProps) => {
  const {
    date,
    format = "jYYYY/jMM/jDD",
    action = "format",
    amount = 0,
    unit = "days",
    className,
  } = props;

  let m = date ? moment(date) : moment();

  if (action === "add") {
    m = m.add(amount, unit);
  } else if (action === "subtract") {
    m = m.subtract(amount, unit);
  } else if (action === "fromNow") {
    return <span className={classNames(className)}>{m.fromNow()}</span>;
  }

  return <span className={classNames(className)}>{m.locale("fa").format(format)}</span>;
};

export const JalaliMomentMeta: CodeComponentMeta<JalaliMomentProps> = {
  name: "JalaliMoment",
  importPath: "@/components/JalaliMoment",
  props: {
    date: {
      type: "string",
      displayName: "Date (Gregorian or Jalali)",
      defaultValue: "",
    },
    format: {
      type: "string",
      displayName: "Format Output",
      defaultValue: "jYYYY/jMM/jDD",
    },
    action: {
      type: "choice",
      options: ["format", "add", "subtract", "fromNow"],
      defaultValue: "format",
    },
    amount: {
      type: "number",
      displayName: "Amount (for add/subtract)",
      defaultValue: 0,
    },
    unit: {
      type: "string",
      displayName: "Unit (days / months / years ...)",
      defaultValue: "days",
    },
    className: {
      type: "class",
    },
  },
};
