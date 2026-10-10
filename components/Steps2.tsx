import * as React from "react";
import {
  PlasmicSteps2,
  DefaultSteps2Props
} from "./plasmic/sayban/PlasmicSteps2";
import styles from "./plasmic/sayban/PlasmicSteps2.module.css";
import redesign from "./Steps2Redesign.module.css";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { toPersianDigits } from "@/lib/datetime";

export interface Steps2Props extends DefaultSteps2Props {
  stepLabels?: readonly string[];
  visualCurrentStep?: number;
}

function StepMark({
  index,
  current,
  done
}: {
  index: number;
  current: boolean;
  done: boolean;
}) {
  return (
    <div
      className={redesign.mark}
      data-current={current ? "1" : "0"}
      data-done={done ? "1" : "0"}
      aria-hidden
    >
      {done && !current ? (
        <svg
          className={redesign.check}
          viewBox="0 0 24 24"
          width="1.05em"
          height="1.05em"
          focusable="false"
        >
          <path
            d="M5.5 12.5 10 17l8.5-9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <span className={redesign.num}>{toPersianDigits(index + 1)}</span>
      )}
    </div>
  );
}

function Steps2_(props: Steps2Props, ref: HTMLElementRefOf<"div">) {
  const { stepLabels, visualCurrentStep = 0, children, className, ...rest } =
    props;

  if (!stepLabels?.length) {
    return (
      <PlasmicSteps2 root={{ ref }} {...rest} className={className}>
        {children}
      </PlasmicSteps2>
    );
  }

  const lastIndex = Math.max(stepLabels.length - 1, 1);
  const progressPct = `${Math.min(
    Math.max(visualCurrentStep / lastIndex, 0),
    1
  ) * 100}%`;

  return (
    <div
      ref={ref}
      data-steps2-redesign="1"
      data-visual-step={String(visualCurrentStep)}
      style={{ ["--steps2-progress" as string]: progressPct }}
      className={[
        "all",
        "root_reset_qARqpE4p5tZmJuNxFbTaPz",
        "plasmic_default_styles",
        "plasmic_mixins",
        styles.root,
        redesign.root,
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={redesign.track} role="list" aria-label="مراحل فرم">
        <div className={redesign.line} aria-hidden>
          <div className={redesign.lineFill} />
        </div>
        {stepLabels.map((label, index) => {
          const current = index === visualCurrentStep;
          const done = index < visualCurrentStep;
          return (
            <div
              className={redesign.item}
              key={label}
              role="listitem"
              data-current={current ? "1" : "0"}
              data-done={done ? "1" : "0"}
            >
              <StepMark index={index} current={current} done={done} />
              <div
                className={redesign.label}
                aria-current={current ? "step" : undefined}
              >
                {label}
              </div>
            </div>
          );
        })}
      </div>
      <div className={`all ${styles.freeBox__lvp2N} ${redesign.body}`}>
        {children}
      </div>
    </div>
  );
}

const Steps2 = React.forwardRef(Steps2_);
export default Steps2;
