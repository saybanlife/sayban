import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import {
  estimateNurseRequestPrice,
  normalizePricingRuleRow,
  PLATFORM_NURSE_PRICING_DEFAULTS,
  type NursePricingRule,
  type PriceEstimateContext,
  type PriceEstimateResult
} from "@/lib/nurseRequest/priceEstimateModel";
import { getMysqlPool } from "./mysqlPool";

function asRuleRows(rows: RowDataPacket[]): NursePricingRule[] {
  return rows.map(row =>
    normalizePricingRuleRow(row as unknown as Record<string, unknown>)
  );
}

export async function listNursePricingRules(centerId?: number | null) {
  const pool = getMysqlPool();
  if (centerId == null) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM centers__nurse_pricing
       WHERE center_id IS NULL AND is_active = 1
       ORDER BY duration_mode, role_mode`
    );
    const platform = asRuleRows(rows);
    return platform.length ? platform : PLATFORM_NURSE_PRICING_DEFAULTS;
  }

  const [centerRows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM centers__nurse_pricing
     WHERE center_id = ? AND is_active = 1
     ORDER BY duration_mode, role_mode`,
    [centerId]
  );
  const centerRules = asRuleRows(centerRows);
  if (centerRules.length) return centerRules;

  const [platformRows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM centers__nurse_pricing
     WHERE center_id IS NULL AND is_active = 1
     ORDER BY duration_mode, role_mode`
  );
  const platform = asRuleRows(platformRows);
  return platform.length ? platform : PLATFORM_NURSE_PRICING_DEFAULTS;
}

export async function listCenterNursePricingForAdmin(centerId: number) {
  const pool = getMysqlPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM centers__nurse_pricing
     WHERE center_id = ?
     ORDER BY duration_mode, FIELD(role_mode,'caregiver','nurse','any')`,
    [centerId]
  );
  return asRuleRows(rows);
}

export async function upsertCenterNursePricingRule(
  centerId: number,
  rule: Omit<NursePricingRule, "id" | "center_id"> & { id?: number }
) {
  const pool = getMysqlPool();
  const factorsJson = JSON.stringify(rule.factors || []);
  if (rule.id) {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE centers__nurse_pricing
       SET duration_mode = ?, role_mode = ?, base_min = ?, base_max = ?,
           currency_label = ?, price_period = ?, factors_json = ?,
           note_template = ?, is_active = ?
       WHERE id = ? AND center_id = ?`,
      [
        rule.duration_mode,
        rule.role_mode,
        rule.base_min,
        rule.base_max,
        rule.currency_label || "تومان",
        rule.price_period,
        factorsJson,
        rule.note_template || null,
        rule.is_active === false ? 0 : 1,
        rule.id,
        centerId
      ]
    );
    if (!result.affectedRows) {
      const err = new Error("Pricing rule not found");
      (err as { statusCode?: number }).statusCode = 404;
      throw err;
    }
    return rule.id;
  }

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO centers__nurse_pricing
      (center_id, duration_mode, role_mode, base_min, base_max, currency_label,
       price_period, factors_json, note_template, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       base_min = VALUES(base_min),
       base_max = VALUES(base_max),
       currency_label = VALUES(currency_label),
       price_period = VALUES(price_period),
       factors_json = VALUES(factors_json),
       note_template = VALUES(note_template),
       is_active = VALUES(is_active)`,
    [
      centerId,
      rule.duration_mode,
      rule.role_mode,
      rule.base_min,
      rule.base_max,
      rule.currency_label || "تومان",
      rule.price_period,
      factorsJson,
      rule.note_template || null,
      rule.is_active === false ? 0 : 1
    ]
  );
  return Number(result.insertId) || rule.id || null;
}

export async function deleteCenterNursePricingRule(
  centerId: number,
  ruleId: number
) {
  const pool = getMysqlPool();
  const [result] = await pool.query<ResultSetHeader>(
    `DELETE FROM centers__nurse_pricing WHERE id = ? AND center_id = ?`,
    [ruleId, centerId]
  );
  return result.affectedRows > 0;
}

export async function estimatePriceForRequest(
  ctx: PriceEstimateContext,
  centerId?: number | null
): Promise<PriceEstimateResult | null> {
  try {
    const rules = await listNursePricingRules(centerId ?? null);
    const source =
      centerId != null && rules.some(rule => rule.center_id === centerId)
        ? "center"
        : "platform";
    return estimateNurseRequestPrice(ctx, rules, source);
  } catch {
    return estimateNurseRequestPrice(
      ctx,
      PLATFORM_NURSE_PRICING_DEFAULTS,
      "platform"
    );
  }
}
