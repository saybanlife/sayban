import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { coerceInterviewOptionsFromOffer } from "../../../components/reservation/interviewSlots";
import {
  mergeReviewIntoMeta,
  parseVisitPostVisitMeta,
  serializeVisitPostVisitMeta
} from "../../../components/reservation/visitPostVisitModel";
import { getMysqlPool } from "./mysqlPool";

/** Same as lifecycle details plus visit_post_visit_meta when the column exists. */
export async function getReservationDetailsEnriched(
  reservationId: number,
  userId: number
) {
  try {
    const [rows] = await getMysqlPool().query<RowDataPacket[]>(
      `SELECT
         r.*,
         c.name AS center_name,
         c.address AS center_address,
         c.city AS center_city,
         c.phone AS center_phone,
         c.latitude AS center_latitude,
         c.longitude AS center_longitude,
         s.name AS service_name,
         s.code AS service_code,
         st.name AS staff_name,
         st.avatar AS staff_avatar,
         st.rating AS staff_rating,
         rl.stage AS lifecycle_stage,
         rl.selected_offer_id,
         rl.interview_options,
         rl.interview_at,
         rl.interview_mode,
         rl.trial_start_at,
         rl.trial_end_at,
         rl.trial_daily_price,
         rl.trial_total_price,
         rl.trial_attendance_user,
         rl.trial_attendance_staff,
         rl.trial_decision,
         rl.contract_deadline,
         rl.contract_closed_at,
         rl.cancellation_policy,
         rl.visit_post_visit_meta,
         o.proposed_slots AS offer_proposed_slots,
         o.proposed_date AS offer_proposed_date,
         o.proposed_time AS offer_proposed_time,
         ua.address AS user_address,
         ua.title AS user_addressTitle,
         ua.city AS user_addressCity,
         (SELECT rq.answers
            FROM reservations__questionnaires rq
           WHERE rq.reservation_id = r.id
           LIMIT 1) AS answers
       FROM reservations r
       LEFT JOIN centers c ON c.id = r.center_id
       LEFT JOIN centers__services s ON s.id = r.service_id
       LEFT JOIN centers__staffs st ON st.id = r.staff_id
       LEFT JOIN reservations__lifecycle rl ON rl.reservation_id = r.id
       LEFT JOIN centers__offers o ON o.id = COALESCE(
         rl.selected_offer_id,
         (
           SELECT o2.id
             FROM centers__offers o2
            WHERE o2.reservation_id = r.id
              AND (r.staff_id IS NULL OR o2.staff_id = r.staff_id)
            ORDER BY o2.id DESC
            LIMIT 1
         )
       )
       LEFT JOIN users__addresses ua ON ua.id = r.user_address_id
       WHERE r.id = ? AND r.user_id = ?
       LIMIT 1`,
      [reservationId, userId]
    );
    const row = rows[0] ?? null;
    if (!row) return null;
    const interviewOptions = coerceInterviewOptionsFromOffer(row);
    return {
      ...row,
      interview_options: interviewOptions.length
        ? interviewOptions
        : row.interview_options
    };
  } catch {
    const { getReservationDetails } = await import("./reservationLifecycleService");
    return getReservationDetails(reservationId, userId);
  }
}

export async function applyVisitContractFeedback(
  reservationId: number,
  userId: number,
  input: {
    contractSigned: boolean;
    declineReason?: string;
    supportRequested?: boolean;
  }
) {
  const pool = getMysqlPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT id FROM reservations WHERE id = ? AND user_id = ? LIMIT 1 FOR UPDATE`,
      [reservationId, userId]
    );
    if (!rows[0]) {
      throw Object.assign(new Error("Reservation not found"), { statusCode: 404 });
    }
    const [metaRows] = await connection.query<RowDataPacket[]>(
      `SELECT visit_post_visit_meta FROM reservations__lifecycle WHERE reservation_id = ? LIMIT 1`,
      [reservationId]
    );
    const next = mergeReviewIntoMeta(
      parseVisitPostVisitMeta(metaRows[0]?.visit_post_visit_meta),
      {
        contract_signed: input.contractSigned,
        decline_reason: input.declineReason?.trim() || null,
        support_requested: Boolean(input.supportRequested)
      }
    );
    await connection.execute<ResultSetHeader>(
      `INSERT INTO reservations__lifecycle (reservation_id, visit_post_visit_meta)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE visit_post_visit_meta = VALUES(visit_post_visit_meta)`,
      [reservationId, serializeVisitPostVisitMeta(next)]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  return getReservationDetailsEnriched(reservationId, userId);
}
