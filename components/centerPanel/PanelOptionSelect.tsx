import * as React from "react";
import styles from "./PanelOptionSelect.module.css";

type PanelOptionSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  label?: string;
  invalid?: boolean;
};

/**
 * In-dialog option list. Native `<select>` popups are owned by the OS and
 * get swallowed by the react-aria modal (pointerdown outside / overflow),
 * so mouse and touch never land on an option.
 */
export function PanelOptionSelect({
  value,
  onChange,
  options,
  placeholder = "انتخاب کنید",
  label,
  invalid
}: PanelOptionSelectProps) {
  const [open, setOpen] = React.useState(false);

  const pick = (next: string) => {
    console.log("[PanelOptionSelect] pick() called with:", next);
    onChange(next);
    setOpen(false);
  };

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.trigger}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        onClick={() => {
          console.log("[PanelOptionSelect] trigger clicked, opening:", !open);
          setOpen(current => !current);
        }}
      >
        <span className={value ? styles.value : styles.placeholder}>
          {value || placeholder}
        </span>
        <span className={styles.chevron} aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <ul className={styles.menu} role="listbox" aria-label={label}>
          <li>
            <button
              type="button"
              role="option"
              className={styles.option}
              aria-selected={value === ""}
              onPointerDown={e => {
                console.log("[PanelOptionSelect] option pointerdown: (empty)");
                e.preventDefault();
                pick("");
              }}
              onClick={() => {
                console.log("[PanelOptionSelect] option click: (empty)");
              }}
            >
              {placeholder}
            </button>
          </li>
          {options.map(option => (
            <li key={option}>
              <button
                type="button"
                role="option"
                className={styles.option}
                aria-selected={value === option}
                onPointerDown={e => {
                  console.log("[PanelOptionSelect] option pointerdown:", option);
                  e.preventDefault();
                  pick(option);
                }}
                onClick={() => {
                  console.log("[PanelOptionSelect] option click:", option);
                }}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default PanelOptionSelect;