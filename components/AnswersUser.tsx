import * as React from "react";
import { useRouter } from "next/router";
import {
  PlasmicAnswersUser,
  DefaultAnswersUserProps
} from "./plasmic/sayban/PlasmicAnswersUser";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { getNationalIdError, sanitizeFieldValue } from "./formFieldRules";
import {
  isQuestionRequired,
  parseNumberQuestionConfig,
  parseTextQuestionConfig
} from "./questions/questionCategories";
import {
  addressCardSubtitle,
  addressCardTitle,
  consumeNewAddressId,
  isSameAddressAnswer,
  rememberKnownAddressIds,
  toAddressAnswer
} from "./questions/addressQuestionModel";
import {
  buildAddAddressDestination,
  isAddAddressRoute,
  rememberAddressDialogReturn
} from "./address/addressDialogFlow";
import { fetchUserAddresses } from "./home/currentAddressApi";
import { listSavedAddresses } from "./user/patientAddressApi";
import type { UserAddress } from "./home/currentAddressModel";
import Icon12Icon from "./plasmic/sayban/icons/PlasmicIcon__Icon12";
import styles from "./AnswersUser.module.css";
import {
  normalizeChoiceOptions,
  toggleMultipleAnswer,
  validateNumberAnswer
} from "./questions/questionAnswerModel";
import PanelDatePicker from "./datetime/PanelDatePicker";
import {
  dateStateToValue,
  dateValueToState
} from "./datetime/dateStateAdapter";
import { formatJalaliWeekdayLong } from "@/lib/datetime";

export interface AnswersUserProps
  extends Omit<DefaultAnswersUserProps, "answers" | "onAnswersChange"> {
  answers?: unknown;
  onAnswersChange?: (value: unknown) => void;
}

type QuestionItem = {
  type?: string;
  question_text?: string;
  is_required?: boolean | number | string | null;
  options?: unknown;
  placeholder?: unknown;
};

function isNationalIdQuestion(questionText: unknown): boolean {
  return /کد\s*ملی/.test(String(questionText || ""));
}

function resolvePlaceholder(item: QuestionItem, fallback: string): string {
  const fromField = String(item.placeholder ?? "").trim();
  if (fromField) return fromField;
  const fromOptions = parseTextQuestionConfig(item.options as any).placeholder;
  if (fromOptions) return fromOptions;
  return fallback;
}

function resolveHelp(item: QuestionItem): string | undefined {
  const help = parseTextQuestionConfig(item.options as any).help;
  return help || undefined;
}

function QuestionLabel({ item, help }: { item: QuestionItem; help?: string }) {
  return (
    <>
      <div className={styles.label}>
        <span>{item.question_text}</span>
        {isQuestionRequired(item) ? (
          <span className={styles.required}>*</span>
        ) : null}
      </div>
      {help ? <div className={styles.help}>{help}</div> : null}
    </>
  );
}

function AddressQuestionField({
  item,
  answers,
  onAnswersChange,
  addressDialogAddUser,
  className,
  rootRef
}: {
  item: QuestionItem;
  answers?: unknown;
  onAnswersChange?: (value: unknown) => void;
  addressDialogAddUser?: () => void;
  className: string;
  rootRef?: React.Ref<HTMLDivElement>;
}) {
  const router = useRouter();
  const [addresses, setAddresses] = React.useState<UserAddress[]>([]);
  const [loading, setLoading] = React.useState(true);
  const navigatingRef = React.useRef(false);
  const onAnswersChangeRef = React.useRef(onAnswersChange);
  onAnswersChangeRef.current = onAnswersChange;
  const help = resolveHelp(item);

  const loadAddresses = React.useCallback(async () => {
    setLoading(true);
    try {
      const rows = listSavedAddresses(await fetchUserAddresses());
      setAddresses(rows);
      const newId = consumeNewAddressId(rows);
      if (newId != null) {
        const created = rows.find(row => Number(row.id) === newId);
        if (created) onAnswersChangeRef.current?.(toAddressAnswer(created));
      }
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  React.useEffect(() => {
    const refresh = () => {
      void loadAddresses();
    };
    window.addEventListener("focus", refresh);
    router.events.on("routeChangeComplete", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      router.events.off("routeChangeComplete", refresh);
    };
  }, [loadAddresses, router.events]);

  const goAddAddress = React.useCallback(async () => {
    if (navigatingRef.current) return;
    rememberKnownAddressIds(addresses.map(row => Number(row.id)));
    if (typeof addressDialogAddUser === "function") {
      addressDialogAddUser();
      return;
    }
    if (isAddAddressRoute(router.asPath)) return;
    navigatingRef.current = true;
    try {
      rememberAddressDialogReturn(router.asPath);
      const pageBase =
        typeof router.query.page === "string" && router.query.page
          ? router.query.page
          : "home";
      await router.push(buildAddAddressDestination(pageBase, router.asPath));
    } finally {
      window.setTimeout(() => {
        navigatingRef.current = false;
      }, 400);
    }
  }, [addressDialogAddUser, addresses, router]);

  return (
    <div ref={rootRef} className={`${className} ${styles.addressBlock}`}>
      <QuestionLabel item={item} />
      {loading ? (
        <div className={styles.addressLoading}>در حال بارگذاری آدرس‌ها…</div>
      ) : (
        <div
          className={styles.addressList}
          role="radiogroup"
          aria-label={item.question_text}
        >
          {addresses.map(address => {
            const selected = isSameAddressAnswer(answers, address);
            return (
              <button
                key={String(address.id)}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`${styles.addressCard} ${
                  selected ? styles.addressCardSelected : ""
                }`}
                onClick={() =>
                  onAnswersChange?.(toAddressAnswer(address))
                }
              >
                <span
                  className={`${styles.addressPin} ${
                    selected ? styles.addressPinSelected : ""
                  }`}
                  aria-hidden
                >
                  <Icon12Icon className={styles.addressPinIcon} role="img" />
                </span>
                <span className={styles.addressText}>
                  <span className={styles.addressTitle}>
                    {addressCardTitle(address)}
                  </span>
                  <span className={styles.addressSubtitle}>
                    {addressCardSubtitle(address)}
                  </span>
                </span>
                <span
                  className={`${styles.addressRadio} ${
                    selected ? styles.addressRadioSelected : ""
                  }`}
                  aria-hidden
                />
              </button>
            );
          })}
          <button
            type="button"
            className={styles.addressAdd}
            onClick={() => {
              void goAddAddress();
            }}
          >
            آدرس جدید +
          </button>
        </div>
      )}
      {help ? (
        <div className={styles.addressHint}>
          <span className={styles.addressHintIcon} aria-hidden>
            ⓘ
          </span>
          <span>{help}</span>
        </div>
      ) : null}
    </div>
  );
}

function AnswersUser_(props: AnswersUserProps, ref: HTMLElementRefOf<"div">) {
  const item = (props.currentItem || {}) as QuestionItem;
  const type = String(item.type || "");
  const isText = type === "text";
  const isTextarea = type === "textarea";
  const isAddress = type === "address";
  const isSingle = type === "single_choice";
  const isMultiple = type === "multiple_choice";
  const isNumber = type === "number";
  const isDate = type === "date";
  const isNationalId = isNationalIdQuestion(item.question_text);
  const [localValue, setLocalValue] = React.useState(
    typeof props.answers === "string" ? props.answers : ""
  );
  const [error, setError] = React.useState<string | undefined>();

  React.useEffect(() => {
    if (typeof props.answers === "string" || typeof props.answers === "number") {
      setLocalValue(String(props.answers));
    }
  }, [props.answers]);

  const className = [styles.root, props.className].filter(Boolean).join(" ");

  if (isAddress) {
    return (
      <AddressQuestionField
        rootRef={ref}
        className={className}
        item={item}
        answers={props.answers}
        onAnswersChange={props.onAnswersChange}
        addressDialogAddUser={props.addressDialogAddUser}
      />
    );
  }

  if (isDate) {
    return (
      <div ref={ref} className={`${className} ${styles.textShort}`}>
        <QuestionLabel item={item} help={resolveHelp(item)} />
        <PanelDatePicker
          appearance="form"
          formatDisplay={formatJalaliWeekdayLong}
          value={dateStateToValue(props.answers)}
          disablePastDates
          placeholder="تاریخ را انتخاب کنید"
          onChange={next => {
            props.onAnswersChange?.(dateValueToState(next));
            setError(undefined);
          }}
        />
        {error ? <div className={styles.error}>{error}</div> : null}
      </div>
    );
  }

  if (isSingle || isMultiple) {
    const options = normalizeChoiceOptions(item.options);
    const selected = isMultiple
      ? Array.isArray(props.answers)
        ? props.answers.map(String)
        : []
      : [String(props.answers ?? "")].filter(Boolean);

    const choose = (value: string) => {
      if (isSingle) {
        props.onAnswersChange?.(value);
        setError(undefined);
        return;
      }
      const next = toggleMultipleAnswer(selected, value);
      props.onAnswersChange?.(next.length ? next : "");
      setError(undefined);
    };

    return (
      <div ref={ref} className={className}>
        <QuestionLabel
          item={item}
          help={
            isMultiple
              ? "می‌توانید چند مورد را انتخاب کنید."
              : "فقط یک مورد را انتخاب کنید."
          }
        />
        <div
          className={`${styles.options} ${
            isSingle &&
            options.length <= 3 &&
            options.every(option => !option.description)
              ? styles.optionsCompact
              : ""
          }`}
          role={isMultiple ? "group" : "radiogroup"}
          aria-label={item.question_text}
        >
          {options.map(option => {
            const active = selected.includes(option.value);
            return (
              <button
                className={`${styles.option} ${
                  active ? styles.optionSelected : ""
                }`}
                type="button"
                key={option.value}
                role={isMultiple ? "checkbox" : "radio"}
                aria-checked={active}
                onClick={() => choose(option.value)}
              >
                <span className={styles.optionText}>
                  <span className={styles.optionLabel}>{option.label}</span>
                  {option.description ? (
                    <span className={styles.optionDescription}>
                      {option.description}
                    </span>
                  ) : null}
                </span>
                <span
                  className={`${styles.indicator} ${
                    isMultiple
                      ? styles.indicatorMulti
                      : styles.indicatorSingle
                  } ${active ? styles.indicatorSelected : ""}`}
                  aria-hidden="true"
                >
                  {isMultiple && active ? (
                    <span className={styles.checkMark}>✓</span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
        {error ? <div className={styles.error}>{error}</div> : null}
      </div>
    );
  }

  if (isNumber) {
    const config = parseNumberQuestionConfig(item.options as any);
    const min = config.min ?? 0;
    const max = config.max ?? undefined;
    const step = config.step && config.step > 0 ? config.step : 1;
    const numeric = localValue === "" ? min : Number(localValue);

    const commit = (candidate: number | string) => {
      if (candidate === "") {
        setLocalValue("");
        props.onAnswersChange?.("");
        setError(
          isQuestionRequired(item) ? "وارد کردن مقدار الزامی است." : undefined
        );
        return;
      }
      const result = validateNumberAnswer(
        candidate,
        config,
        isQuestionRequired(item)
      );
      setLocalValue(result.value || String(candidate));
      props.onAnswersChange?.(result.value);
      setError(result.error);
    };

    return (
      <div ref={ref} className={className}>
        <div className={styles.numberCard}>
          <QuestionLabel item={item} />
          <div className={styles.numberControls}>
            <button
              className={styles.numberButton}
              type="button"
              aria-label="کاهش مقدار"
              disabled={numeric - step < min}
              onClick={() => commit(numeric - step)}
            >
              −
            </button>
            <input
              className={styles.numberInput}
              type="number"
              inputMode="decimal"
              min={min}
              max={max}
              step={step}
              value={localValue}
              aria-label={item.question_text || "مقدار عددی"}
              onChange={event => {
                const next = event.target.value;
                setLocalValue(next);
                if (next === "") props.onAnswersChange?.("");
              }}
              onBlur={() => commit(localValue)}
            />
            <button
              className={styles.numberButton}
              type="button"
              aria-label="افزایش مقدار"
              disabled={max != null && numeric + step > max}
              onClick={() => commit(numeric + step)}
            >
              +
            </button>
          </div>
        </div>
        {error ? <div className={styles.error}>{error}</div> : null}
      </div>
    );
  }

  if (isText || isTextarea) {
    const placeholder = resolvePlaceholder(
      item,
      isNationalId
        ? "کد ملی"
        : isTextarea
          ? "پاسخ خود را بنویسید…"
          : "پاسخ خود را وارد کنید"
    );
    const help = resolveHelp(item);

    const commitText = (raw: string) => {
      const next = isNationalId
        ? sanitizeFieldValue("nationalId", String(raw ?? ""), 10)
        : String(raw ?? "");
      setLocalValue(next);
      props.onAnswersChange?.(next);
      if (isNationalId) {
        const nextError =
          next.length === 10
            ? getNationalIdError(next, true)
            : next.length > 0
              ? "کد ملی باید ۱۰ رقم باشد"
              : undefined;
        setError(nextError);
      } else {
        setError(undefined);
      }
    };

    return (
      <div
        ref={ref}
        className={`${className} ${
          isTextarea ? styles.textLong : styles.textShort
        }`}
      >
        <QuestionLabel item={item} help={help} />
        {isTextarea ? (
          <textarea
            className={styles.longInput}
            dir="rtl"
            rows={6}
            value={localValue}
            placeholder={placeholder}
            aria-label={item.question_text || "پاسخ"}
            maxLength={4000}
            onChange={event => commitText(event.target.value)}
          />
        ) : (
          <input
            className={`${styles.shortInput}${
              error ? ` ${styles.inputError}` : ""
            }`}
            dir="rtl"
            type="text"
            inputMode={isNationalId ? "numeric" : undefined}
            maxLength={isNationalId ? 10 : 200}
            minLength={isNationalId ? 10 : undefined}
            pattern={isNationalId ? "\\d{10}" : undefined}
            value={localValue}
            placeholder={placeholder}
            aria-label={
              item.question_text || (isNationalId ? "کد ملی" : "پاسخ")
            }
            aria-invalid={error ? true : undefined}
            onChange={event => commitText(event.target.value)}
          />
        )}
        {error ? <div className={styles.error}>{error}</div> : null}
      </div>
    );
  }

  return (
    <PlasmicAnswersUser
      root={{ ref }}
      {...(props as DefaultAnswersUserProps)}
    />
  );
}

const AnswersUser = React.forwardRef(AnswersUser_);
export default AnswersUser;
