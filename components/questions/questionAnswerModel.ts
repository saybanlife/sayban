import type { NumberQuestionConfig } from "./questionCategories";

export type ChoiceOption = {
  value: string;
  label: string;
  description?: string;
};

export function normalizeChoiceOptions(value: unknown): ChoiceOption[] {
  let raw: unknown = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch {
      raw = [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .map(item => {
      if (item && typeof item === "object") {
        const row = item as Record<string, unknown>;
        const optionValue = String(row.value ?? row.label ?? "").trim();
        return {
          value: optionValue,
          label: String(row.label ?? optionValue).trim(),
          description: row.description
            ? String(row.description).trim()
            : undefined
        };
      }
      const optionValue = String(item ?? "").trim();
      return { value: optionValue, label: optionValue };
    })
    .filter(option => option.value && option.label);
}

export function parseChoiceEditorLines(value: string): (string | ChoiceOption)[] {
  return value
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [labelPart, ...descriptionParts] = line.split("|");
      const label = labelPart.trim();
      const description = descriptionParts.join("|").trim();
      return description ? { value: label, label, description } : label;
    });
}

export function formatChoiceEditorLines(value: unknown): string {
  return normalizeChoiceOptions(value)
    .map(option =>
      option.description
        ? `${option.label} | ${option.description}`
        : option.label
    )
    .join("\n");
}

export function toggleMultipleAnswer(
  selected: string[],
  value: string
): string[] {
  return selected.includes(value)
    ? selected.filter(option => option !== value)
    : [...selected, value];
}

export function validateNumberAnswer(
  candidate: string | number,
  config: NumberQuestionConfig,
  required = false
): { value: string; error?: string } {
  if (candidate === "") {
    return {
      value: "",
      error: required ? "وارد کردن مقدار الزامی است." : undefined
    };
  }
  const value = Number(candidate);
  if (!Number.isFinite(value)) {
    return { value: "", error: "یک مقدار عددی معتبر وارد کنید." };
  }
  const min = config.min ?? 0;
  if (value < min) {
    return { value: "", error: `مقدار نمی‌تواند کمتر از ${min} باشد.` };
  }
  if (config.max != null && value > config.max) {
    return {
      value: "",
      error: `مقدار نمی‌تواند بیشتر از ${config.max} باشد.`
    };
  }
  const step = config.step && config.step > 0 ? config.step : 1;
  const offset = (value - min) / step;
  if (Math.abs(offset - Math.round(offset)) > 1e-9) {
    return { value: "", error: `مقدار باید با گام ${step} وارد شود.` };
  }
  return { value: String(value) };
}

