import * as React from "react";
import TextInput, { TextInputProps } from "./TextInput";
import styles from "./HomeSearchInput.module.css";

const PLACEHOLDER_PREFIX = "جستجوی ";
const PLACEHOLDER_SUFFIX = "مرکز، خدمات و امکانات";

export type HomeSearchInputProps = TextInputProps & {
  onDebouncedValueChange?: (value: string) => void;
  header?: React.ReactNode;
};

export const HOME_SEARCH_DEBOUNCE_MS = 250;

export function HomeSearchInput({
  onChange,
  onDebouncedValueChange,
  header,
  ...inputProps
}: HomeSearchInputProps) {
  const externalValue = String(inputProps.value ?? "");
  const [draft, setDraft] = React.useState(externalValue);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmittedRef = React.useRef(externalValue);

  React.useEffect(() => {
    if (externalValue !== lastEmittedRef.current) setDraft(externalValue);
  }, [externalValue]);

  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const handleChange = React.useCallback(
    (value: string) => {
      setDraft(value);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        lastEmittedRef.current = value;
        onChange?.(value);
        onDebouncedValueChange?.(value);
      }, HOME_SEARCH_DEBOUNCE_MS);
    },
    [onChange, onDebouncedValueChange]
  );

  const hasValue = Boolean(draft.trim());

  return (
    <div className={styles.wrap}>
      {header}
      {!hasValue ? (
        <div className={styles.placeholderOverlay} aria-hidden="true">
          <span className={styles.placeholderPrefix}>{PLACEHOLDER_PREFIX}</span>
          <span className={styles.placeholderAccent}>{PLACEHOLDER_SUFFIX}</span>
        </div>
      ) : null}
      <TextInput
        {...inputProps}
        value={draft}
        onChange={handleChange}
        placeholder=" "
        className={styles.input}
      />
    </div>
  );
}

export default HomeSearchInput;