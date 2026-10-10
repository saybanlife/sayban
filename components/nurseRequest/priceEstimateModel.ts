/**
 * Extensible nurse-request price estimation.
 * Centers can override base ranges + factors; platform defaults apply when no center rule exists.
 */

export type PriceDurationMode = "once" | "continuous";
export type PriceRoleMode = "caregiver" | "nurse" | "any";

export type PriceFactorEffect =
  | "multiply"
  | "add"
  | "add_range"
  | "multiply_range";

export type PriceFactor = {
  key: string;
  label: string;
  effect: PriceFactorEffect;
  /** Optional match against estimate context fields / answer labels. */
  when?: {
    field?: string;
    includes?: string[];
    equals?: string;
  };
  value?: number;
  min?: number;
  max?: number;
};

export type NursePricingRule = {
  id?: number;
  center_id?: number | null;
  duration_mode: PriceDurationMode;
  role_mode: PriceRoleMode;
  base_min: number;
  base_max: number;
  currency_label?: string;
  price_period: "service" | "monthly";
  factors?: PriceFactor[];
  note_template?: string | null;
  is_active?: boolean;
};

export type PriceEstimateContext = {
  duration: PriceDurationMode | null;
  role: PriceRoleMode | "unsure" | null;
  serviceLabels?: string[];
  /** Flattened answer map: question label → display value */
  answers?: Record<string, string>;
  shiftHours?: number | null;
};

export type PriceEstimateResult = {
  min: number;
  max: number;
  currencyLabel: string;
  periodLabel: string;
  heading: string;
  note: string;
  appliedFactorKeys: string[];
  ruleSource: "center" | "platform";
};

/** Platform defaults aligned with product mocks (تومان). */
export const PLATFORM_NURSE_PRICING_DEFAULTS: NursePricingRule[] = [
  {
    duration_mode: "once",
    role_mode: "any",
    base_min: 900_000,
    base_max: 1_200_000,
    price_period: "service",
    note_template: "نمونه. قیمت نهایی را نیروها پیشنهاد می‌دهند.",
    factors: [
      {
        key: "night_shift",
        label: "شیفت شب",
        effect: "multiply_range",
        when: { field: "answers", includes: ["شب", "شبانه"] },
        min: 1.05,
        max: 1.15
      },
      {
        key: "long_shift_12h",
        label: "شیفت ۱۲ ساعته",
        effect: "multiply_range",
        when: { field: "shiftHours", equals: "12" },
        min: 1.05,
        max: 1.1
      },
      {
        key: "hospital",
        label: "همراه بیمارستان",
        effect: "multiply_range",
        when: { field: "serviceLabels", includes: ["بیمارستان", "همراه"] },
        min: 1.0,
        max: 1.05
      }
    ]
  },
  {
    duration_mode: "continuous",
    role_mode: "caregiver",
    base_min: 28_000_000,
    base_max: 36_000_000,
    price_period: "monthly",
    note_template:
      "نمونه. مرکز بعد از ۲ روز آزمایشی قیمت نهایی را اعلام می‌کند.",
    factors: [
      {
        key: "multi_person",
        label: "چند نفر",
        effect: "add_range",
        when: { field: "answers", includes: ["۳ نفر", "3 نفر", "چند نفر"] },
        min: 0,
        max: 2_000_000
      }
    ]
  },
  {
    duration_mode: "continuous",
    role_mode: "nurse",
    base_min: 12_000_000,
    base_max: 18_000_000,
    price_period: "monthly",
    note_template:
      "نمونه. مرکز بعد از ۲ روز آزمایشی قیمت نهایی را اعلام می‌کند.",
    factors: [
      {
        key: "daily_visit_short",
        label: "ویزیت کوتاه",
        effect: "multiply_range",
        when: { field: "answers", includes: ["۱ تا ۲", "1 تا 2", "ویزیت"] },
        min: 0.95,
        max: 1.0
      }
    ]
  },
  {
    duration_mode: "continuous",
    role_mode: "any",
    base_min: 20_000_000,
    base_max: 30_000_000,
    price_period: "monthly",
    note_template:
      "نمونه. مرکز بعد از ۲ روز آزمایشی قیمت نهایی را اعلام می‌کند.",
    factors: []
  }
];

function faDigits(value: string | number) {
  return String(value).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

export function formatTomanRange(min: number, max: number): string {
  const fmt = (n: number) => {
    if (n >= 1_000_000) {
      const m = n / 1_000_000;
      const text =
        Number.isInteger(m) || Math.abs(m - Math.round(m * 10) / 10) < 0.05
          ? (Math.round(m * 10) / 10).toLocaleString("fa-IR")
          : m.toLocaleString("fa-IR", { maximumFractionDigits: 1 });
      return `${text} میلیون`;
    }
    return `${Math.round(n).toLocaleString("fa-IR")}`;
  };
  if (Math.round(min) === Math.round(max)) {
    return `${fmt(min)} تومان`;
  }
  return `${fmt(min)} تا ${fmt(max)} تومان`;
}

function fieldHaystack(
  ctx: PriceEstimateContext,
  field?: string
): string {
  if (!field) return "";
  if (field === "shiftHours") {
    return ctx.shiftHours != null ? String(ctx.shiftHours) : "";
  }
  if (field === "serviceLabels") {
    return (ctx.serviceLabels || []).join(" ");
  }
  if (field === "answers") {
    return Object.entries(ctx.answers || {})
      .map(([k, v]) => `${k} ${v}`)
      .join(" ");
  }
  if (field === "duration") return String(ctx.duration || "");
  if (field === "role") return String(ctx.role || "");
  const fromAnswers = ctx.answers?.[field];
  return fromAnswers != null ? String(fromAnswers) : "";
}

function factorMatches(factor: PriceFactor, ctx: PriceEstimateContext) {
  const when = factor.when;
  if (!when) return true;
  const hay = fieldHaystack(ctx, when.field || "answers");
  if (when.equals != null && when.equals !== "") {
    return hay === when.equals || hay.includes(when.equals);
  }
  if (when.includes?.length) {
    return when.includes.some(token => hay.includes(token));
  }
  return Boolean(hay.trim());
}

function applyFactor(
  min: number,
  max: number,
  factor: PriceFactor
): { min: number; max: number } {
  const v = Number(factor.value);
  const fMin = Number(factor.min);
  const fMax = Number(factor.max);
  switch (factor.effect) {
    case "multiply":
      return {
        min: min * (Number.isFinite(v) ? v : 1),
        max: max * (Number.isFinite(v) ? v : 1)
      };
    case "add":
      return {
        min: min + (Number.isFinite(v) ? v : 0),
        max: max + (Number.isFinite(v) ? v : 0)
      };
    case "add_range":
      return {
        min: min + (Number.isFinite(fMin) ? fMin : 0),
        max: max + (Number.isFinite(fMax) ? fMax : Number.isFinite(fMin) ? fMin : 0)
      };
    case "multiply_range":
      return {
        min: min * (Number.isFinite(fMin) ? fMin : 1),
        max: max * (Number.isFinite(fMax) ? fMax : Number.isFinite(fMin) ? fMin : 1)
      };
    default:
      return { min, max };
  }
}

export function pickPricingRule(
  rules: NursePricingRule[],
  ctx: PriceEstimateContext
): NursePricingRule | null {
  const duration = ctx.duration;
  if (!duration) return null;
  const role =
    ctx.role === "caregiver" || ctx.role === "nurse" ? ctx.role : "any";

  const active = rules.filter(
    rule =>
      rule.is_active !== false &&
      rule.duration_mode === duration &&
      Number(rule.base_min) > 0 &&
      Number(rule.base_max) > 0
  );

  const exact = active.find(rule => rule.role_mode === role);
  if (exact) return exact;
  return active.find(rule => rule.role_mode === "any") || null;
}

export function estimateNurseRequestPrice(
  ctx: PriceEstimateContext,
  rules: NursePricingRule[] = PLATFORM_NURSE_PRICING_DEFAULTS,
  ruleSource: "center" | "platform" = "platform"
): PriceEstimateResult | null {
  const rule = pickPricingRule(rules, ctx);
  if (!rule) return null;

  let min = Number(rule.base_min);
  let max = Number(rule.base_max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) return null;

  const appliedFactorKeys: string[] = [];
  for (const factor of rule.factors || []) {
    if (!factorMatches(factor, ctx)) continue;
    const next = applyFactor(min, max, factor);
    min = next.min;
    max = next.max;
    appliedFactorKeys.push(factor.key);
  }

  min = Math.round(min);
  max = Math.round(max);

  const periodLabel =
    rule.price_period === "monthly" ? "ماهانه" : "این خدمت";
  const heading =
    rule.price_period === "monthly"
      ? "قیمت معمول ماهانه"
      : "قیمت معمول این خدمت";

  return {
    min,
    max,
    currencyLabel: rule.currency_label || "تومان",
    periodLabel,
    heading,
    note:
      String(rule.note_template || "").trim() ||
      (rule.price_period === "monthly"
        ? "نمونه. مرکز بعد از ۲ روز آزمایشی قیمت نهایی را اعلام می‌کند."
        : "نمونه. قیمت نهایی را نیروها پیشنهاد می‌دهند."),
    appliedFactorKeys,
    ruleSource
  };
}

export function parseFactorsJson(raw: unknown): PriceFactor[] {
  if (Array.isArray(raw)) return raw as PriceFactor[];
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PriceFactor[]) : [];
  } catch {
    return [];
  }
}

export function normalizePricingRuleRow(
  row: Record<string, unknown>
): NursePricingRule {
  return {
    id: row.id != null ? Number(row.id) : undefined,
    center_id:
      row.center_id == null || row.center_id === ""
        ? null
        : Number(row.center_id),
    duration_mode:
      row.duration_mode === "continuous" ? "continuous" : "once",
    role_mode:
      row.role_mode === "caregiver" || row.role_mode === "nurse"
        ? row.role_mode
        : "any",
    base_min: Number(row.base_min) || 0,
    base_max: Number(row.base_max) || 0,
    currency_label: String(row.currency_label || "تومان"),
    price_period: row.price_period === "monthly" ? "monthly" : "service",
    factors: parseFactorsJson(row.factors_json ?? row.factors),
    note_template:
      row.note_template == null ? null : String(row.note_template),
    is_active: row.is_active == null ? true : Boolean(Number(row.is_active))
  };
}

export function estimateDisplayRange(result: PriceEstimateResult): string {
  return formatTomanRange(result.min, result.max);
}

export function faPriceDigits(value: string | number) {
  return faDigits(value);
}
