import * as React from "react";
import {
  formatQuestionnaireAnswer,
  type QuestionnaireAnswerItem
} from "./questionnaireAnswers";
import ShowOnMapButton from "./ShowOnMapButton";
import type { MapLocationInput } from "./reservationMapLinks";
import styles from "./QuestionnaireAnswerValue.module.css";

type Props = {
  item: QuestionnaireAnswerItem | null | undefined;
};

function asAddressLocation(
  item: QuestionnaireAnswerItem | null | undefined
): MapLocationInput | null {
  if (!item || String(item.type ?? "") !== "address") return null;
  const answer = item.answer;
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
    return null;
  }
  return answer as MapLocationInput;
}

export default function QuestionnaireAnswerValue({ item }: Props) {
  const text = formatQuestionnaireAnswer(item);
  const location = asAddressLocation(item);

  return (
    <span className={styles.wrap}>
      <span className={styles.text}>{text || "—"}</span>
      {location ? <ShowOnMapButton location={location} /> : null}
    </span>
  );
}
