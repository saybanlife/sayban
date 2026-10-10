import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { getMysqlPool } from "./mysqlPool";
import {
  normalizeStaffServiceDurationMode,
  type StaffServiceDurationMode
} from "../../../components/nurseRequest/staffServiceDuration";

export type StaffCatalogServiceRow = {
  id: number;
  name: string;
  category: string | null;
  description: string | null;
  duration_mode: StaffServiceDurationMode | null;
  is_active: number | null;
};

export async function listStaffCatalogServices(options?: {
  category?: string | null;
}): Promise<StaffCatalogServiceRow[]> {
  const category = String(options?.category || "").trim();
  const params: unknown[] = [];
  let categorySql = "";
  if (category === "general" || category === "specialized") {
    categorySql = " AND s.category = ?";
    params.push(category);
  }
  try {
    const [rows] = await getMysqlPool().query<RowDataPacket[]>(
      `SELECT s.id, s.name, s.category, s.description, s.duration_mode, s.is_active
         FROM centers__services s
        WHERE s.center_id IS NULL
          AND s.category IN ('general', 'specialized')
          AND (s.code IS NULL OR s.code <> 'VISIT')
          ${categorySql}
        ORDER BY s.category ASC, s.id ASC`,
      params
    );
    return rows.map(row => ({
      id: Number(row.id),
      name: String(row.name || ""),
      category: row.category != null ? String(row.category) : null,
      description: row.description != null ? String(row.description) : null,
      duration_mode: normalizeStaffServiceDurationMode(row.duration_mode),
      is_active: row.is_active == null ? null : Number(row.is_active)
    }));
  } catch (error) {
    // Column missing before migration: fall back without duration_mode.
    const message = String((error as Error)?.message || "");
    if (!/duration_mode/i.test(message)) throw error;
    const [rows] = await getMysqlPool().query<RowDataPacket[]>(
      `SELECT s.id, s.name, s.category, s.description, s.is_active
         FROM centers__services s
        WHERE s.center_id IS NULL
          AND s.category IN ('general', 'specialized')
          AND (s.code IS NULL OR s.code <> 'VISIT')
          ${categorySql}
        ORDER BY s.category ASC, s.id ASC`,
      params
    );
    return rows.map(row => ({
      id: Number(row.id),
      name: String(row.name || ""),
      category: row.category != null ? String(row.category) : null,
      description: row.description != null ? String(row.description) : null,
      duration_mode: null,
      is_active: row.is_active == null ? null : Number(row.is_active)
    }));
  }
}

export async function updateStaffServiceDurationMode(
  serviceId: number,
  durationMode: StaffServiceDurationMode | null
): Promise<StaffCatalogServiceRow | null> {
  const [existing] = await getMysqlPool().query<RowDataPacket[]>(
    `SELECT id FROM centers__services
      WHERE id = ? AND center_id IS NULL
        AND category IN ('general', 'specialized')
      LIMIT 1`,
    [serviceId]
  );
  if (!existing[0]) return null;

  await getMysqlPool().execute<ResultSetHeader>(
    `UPDATE centers__services SET duration_mode = ? WHERE id = ? AND center_id IS NULL`,
    [durationMode, serviceId]
  );

  const list = await listStaffCatalogServices();
  return list.find(item => item.id === serviceId) ?? null;
}
