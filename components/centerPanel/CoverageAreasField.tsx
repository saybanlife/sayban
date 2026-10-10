import * as React from "react";
import Modal from "../Modal";
import {
  DISPATCH_TEHRAN_DISTRICT_OPTIONS,
  type DispatchTehranDistrictOption
} from "./centerFactsSchema";
import {
  formatCoverageAreasSummary,
  toggleCoverageArea
} from "./coverageAreasModel";
import styles from "./CoverageAreasField.module.css";

type CoverageAreasFieldProps = {
  value: readonly DispatchTehranDistrictOption[];
  onChange: (next: DispatchTehranDistrictOption[]) => void;
  label?: string;
  invalid?: boolean;
};

export function CoverageAreasField({
  value,
  onChange,
  label = "مناطق تحت پوشش",
  invalid
}: CoverageAreasFieldProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DispatchTehranDistrictOption[]>([
    ...value
  ]);

  React.useEffect(() => {
    if (open) setDraft([...value]);
  }, [open, value]);

  const summary = formatCoverageAreasSummary(value);
  const hasValue = value.length > 0;

  const toggle = (option: DispatchTehranDistrictOption) => {
    setDraft(current => toggleCoverageArea(current, option));
  };

  const confirm = () => {
    onChange([...draft]);
    setOpen(false);
  };

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        onClick={() => setOpen(true)}
      >
        <span className={hasValue ? styles.value : styles.placeholder}>
          {summary}
        </span>
        <span className={styles.chevron} aria-hidden>
          ▾
        </span>
      </button>

      <Modal
        className={styles.pickerModal}
        closeOnBackdropClick={true}
        content={
          <div className={styles.picker} dir="rtl">
            <div className={styles.optionList} role="group" aria-label={label}>
              {DISPATCH_TEHRAN_DISTRICT_OPTIONS.map(option => {
                const active = draft.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    className={`${styles.option}${
                      active ? ` ${styles.optionActive}` : ""
                    }`}
                    aria-pressed={active}
                    onClick={() => toggle(option)}
                  >
                    <span className={styles.optionLabel}>{option}</span>
                    <span
                      className={`${styles.check}${
                        active ? ` ${styles.checkOn}` : ""
                      }`}
                      aria-hidden
                    >
                      {active ? "✓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className={styles.pickerActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setOpen(false)}
              >
                انصراف
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={confirm}
              >
                تأیید
              </button>
            </div>
          </div>
        }
        heading={label}
        isOpen={open}
        noTrigger={true}
        onOpenChange={next => setOpen(Boolean(next))}
        showFooter={false}
        showHeader={true}
        trigger={null}
      />
    </div>
  );
}

export default CoverageAreasField;
