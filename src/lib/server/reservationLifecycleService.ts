import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { coerceInterviewOptionsFromOffer } from "../../../components/reservation/interviewSlots";
import { CANCELABLE_RESERVATION_STATUSES } from "../../../components/reservation/reservationDetailsModel";
import {
  mergeReviewIntoMeta,
  parseVisitPostVisitMeta,
  serializeVisitPostVisitMeta
} from "../../../components/reservation/visitPostVisitModel";
import { getMysqlPool } from "./mysqlPool";
import { applyVisitContractFeedback } from "./reservationVisitPostVisitService";

export const RESERVATION_ACTIONS = [
  "cancel_request",
  "select_interview",
  "report_attendance",
  "trial_decision",
  "close_contract",
  "visit_contract_feedback"
] as const;

export type ReservationAction = (typeof RESERVATION_ACTIONS)[number];

type ActionInput = {
  action: ReservationAction;
  interviewAt?: string;
  interviewMode?: "online" | "home" | "center";
  attended?: boolean;
  decision?: "continue" | "stop";
  contractSigned?: boolean;
  declineReason?: string;
  supportRequested?: boolean;
};

function validDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString().slice(0, 19).replace("T", " ");
}

export async function getReservationDetails(
  reservationId: number,
  userId: number
) {
  const [rows] = await getMysqlPool().query<RowDataPacket[]>(
    `SELECT
       r.*,
       c.name AS center_name,
       c.address AS center_address,
       c.city AS center_city,
       c.phone AS center_phone,
       c.latitude AS center_latitude,
       c.longitude AS center_longitude,
       MD5(c.id) AS center_public_id,
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
}

export async function applyReservationAction(
  reservationId: number,
  userId: number,
  input: ActionInput
) {
  if (input.action === "visit_contract_feedback") {
    // Ownership is re-checked inside applyVisitContractFeedback.
    return applyVisitContractFeedback(reservationId, userId, {
      contractSigned: Boolean(input.contractSigned),
      declineReason: input.declineReason,
      supportRequested: input.supportRequested
    });
  }

  const pool = getMysqlPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT r.status, r.service_location, rl.stage AS lifecycle_stage,
              rl.interview_options
         FROM reservations r
         LEFT JOIN reservations__lifecycle rl ON rl.reservation_id = r.id
        WHERE r.id = ? AND r.user_id = ?
        FOR UPDATE`,
      [reservationId, userId]
    );
    const current = rows[0];
    if (!current) throw Object.assign(new Error("Reservation not found"), { statusCode: 404 });

    if (input.action === "cancel_request") {
      if (
        !(CANCELABLE_RESERVATION_STATUSES as readonly string[]).includes(
          String(current.status)
        )
      ) {
        throw Object.assign(new Error("Reservation cannot be canceled at this stage"), { statusCode: 409 });
      }
      await connection.execute(
        "UPDATE reservations SET status = 'canceled' WHERE id = ? AND user_id = ?",
        [reservationId, userId]
      );
    } else if (input.action === "select_interview") {
      const interviewAt = validDate(input.interviewAt);
      const interviewMode = input.interviewMode;
      if (!interviewAt || !interviewMode || !["online", "home", "center"].includes(interviewMode)) {
        throw Object.assign(new Error("Invalid interview selection"), { statusCode: 400 });
      }
      let options: Array<{ starts_at?: string; modes?: string[] }> = [];
      try {
        options = JSON.parse(String(current.interview_options || "[]"));
      } catch {
        options = [];
      }
      const selected = options.find(option => validDate(option.starts_at) === interviewAt);
      if (!selected || (selected.modes?.length && !selected.modes.includes(interviewMode))) {
        throw Object.assign(new Error("Interview option is not available"), { statusCode: 409 });
      }
      await connection.execute<ResultSetHeader>(
        `INSERT INTO reservations__lifecycle
           (reservation_id, stage, interview_at, interview_mode)
         VALUES (?, 'interview_scheduled', ?, ?)
         ON DUPLICATE KEY UPDATE
           stage = VALUES(stage), interview_at = VALUES(interview_at),
           interview_mode = VALUES(interview_mode)`,
        [reservationId, interviewAt, interviewMode]
      );
    } else if (input.action === "report_attendance") {
      if (typeof input.attended !== "boolean") {
        throw Object.assign(new Error("Attendance is required"), { statusCode: 400 });
      }
      if (String(current.lifecycle_stage) !== "trial_in_progress") {
        throw Object.assign(new Error("Attendance cannot be reported at this stage"), { statusCode: 409 });
      }
      await connection.execute<ResultSetHeader>(
        `INSERT INTO reservations__lifecycle
           (reservation_id, stage, trial_attendance_user)
         VALUES (?, 'trial_in_progress', ?)
         ON DUPLICATE KEY UPDATE
           stage = VALUES(stage), trial_attendance_user = VALUES(trial_attendance_user)`,
        [reservationId, input.attended ? 1 : 0]
      );
    } else if (input.action === "trial_decision") {
      if (!input.decision || !["continue", "stop"].includes(input.decision)) {
        throw Object.assign(new Error("Invalid trial decision"), { statusCode: 400 });
      }
      if (String(current.lifecycle_stage) !== "trial_decision") {
        throw Object.assign(new Error("Trial decision is not available at this stage"), { statusCode: 409 });
      }
      const stage = input.decision === "continue" ? "awaiting_contract" : "trial_stopped";
      await connection.execute<ResultSetHeader>(
        `INSERT INTO reservations__lifecycle
           (reservation_id, stage, trial_decision)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           stage = VALUES(stage), trial_decision = VALUES(trial_decision)`,
        [reservationId, stage, input.decision]
      );
      if (input.decision === "stop") {
        await connection.execute(
          "UPDATE reservations SET status = 'canceled' WHERE id = ? AND user_id = ?",
          [reservationId, userId]
        );
      }
    } else if (input.action === "close_contract") {
      if (String(current.lifecycle_stage) !== "awaiting_contract") {
        throw Object.assign(new Error("Contract cannot be closed at this stage"), { statusCode: 409 });
      }
      await connection.execute<ResultSetHeader>(
        `INSERT INTO reservations__lifecycle
           (reservation_id, stage, contract_closed_at)
         VALUES (?, 'contract_closed', UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE
           stage = VALUES(stage), contract_closed_at = VALUES(contract_closed_at)`,
        [reservationId]
      );
    }

    await connection.commit();
    return getReservationDetails(reservationId, userId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
