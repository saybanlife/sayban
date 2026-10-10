import type { RowDataPacket } from "mysql2/promise";

import {
  parseInterviewOptions,
  type InterviewOption
} from "../../../components/reservation/reservationDetailsModel";
import {
  draftsToInterviewOptions,
  type InterviewSlotDraft
} from "../../../components/reservation/interviewSlots";
import { parseDate, parseTime } from "@/lib/datetime";
import { getMysqlPool } from "./mysqlPool";

export type SaveNurseInterviewSlotsInput = {
  reservationId: number;
  centerId: number;
  staffId?: number | null;
  slots: InterviewSlotDraft[];
  modes?: InterviewOption["modes"];
};

function firstSlotParts(options: InterviewOption[]) {
  const first = options[0];
  if (!first?.starts_at) return { date: null as string | null, time: null as string | null };
  const raw = String(first.starts_at).replace(" ", "T");
  const [datePart, timePart = ""] = raw.split("T");
  return {
    date: parseDate(datePart) || null,
    time: parseTime(timePart.slice(0, 5)) || null
  };
}

export async function loadNurseInterviewSlotsState(input: {
  reservationId: number;
  centerId: number;
}) {
  const pool = getMysqlPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       r.id AS reservation_id,
       r.staff_id,
       r.status,
       r.center_id,
       rl.interview_options,
       rl.interview_at,
       rl.interview_mode,
       rl.selected_offer_id,
       st.name AS staff_name
     FROM reservations r
     LEFT JOIN reservations__lifecycle rl ON rl.reservation_id = r.id
     LEFT JOIN centers__staffs st ON st.id = r.staff_id
     WHERE r.id = ?
     LIMIT 1`,
    [input.reservationId]
  );
  const row = rows[0];
  if (!row) return null;
  if (
    Number(row.center_id) > 0 &&
    Number(row.center_id) !== Number(input.centerId)
  ) {
    const err = new Error("Reservation belongs to another center");
    (err as { statusCode?: number }).statusCode = 403;
    throw err;
  }

  const [offerRows] = await pool.query<RowDataPacket[]>(
    `SELECT id, staff_id, proposed_date, proposed_time, proposed_slots
       FROM centers__offers
      WHERE reservation_id = ? AND center_id = ?
      ORDER BY
        CASE WHEN ? IS NOT NULL AND id = ? THEN 0 ELSE 1 END,
        CASE WHEN ? IS NOT NULL AND staff_id = ? THEN 0 ELSE 1 END,
        id DESC
      LIMIT 1`,
    [
      input.reservationId,
      input.centerId,
      row.selected_offer_id,
      row.selected_offer_id,
      row.staff_id,
      row.staff_id
    ]
  );
  const offer = offerRows[0];

  let staffName = row.staff_name ? String(row.staff_name) : "";
  if (!staffName && offer?.staff_id) {
    const [staffRows] = await pool.query<RowDataPacket[]>(
      `SELECT name FROM centers__staffs WHERE id = ? LIMIT 1`,
      [offer.staff_id]
    );
    staffName = staffRows[0]?.name ? String(staffRows[0].name) : "";
  }

  const fromLifecycle = parseInterviewOptions(row.interview_options);
  const fromOffer = parseInterviewOptions(offer?.proposed_slots);
  const resolved =
    fromLifecycle.length > 0
      ? fromLifecycle
      : fromOffer.length > 0
        ? fromOffer
        : offer?.proposed_date
          ? draftsToInterviewOptions([
              {
                id: "legacy",
                date: parseDate(offer.proposed_date),
                time: parseTime(offer.proposed_time)
              }
            ])
          : [];

  return {
    reservationId: Number(row.reservation_id),
    staffId: row.staff_id != null ? Number(row.staff_id) : null,
    offerId: offer?.id != null ? Number(offer.id) : null,
    offerStaffId: offer?.staff_id != null ? Number(offer.staff_id) : null,
    staffName,
    status: String(row.status || ""),
    interviewOptions: resolved,
    interviewAt: row.interview_at ? String(row.interview_at) : null,
    interviewMode: row.interview_mode ? String(row.interview_mode) : null
  };
}

export async function saveNurseInterviewSlots(
  input: SaveNurseInterviewSlotsInput
) {
  const options = draftsToInterviewOptions(input.slots, input.modes);
  if (options.length < 1) {
    const err = new Error("At least one interview slot is required");
    (err as { statusCode?: number }).statusCode = 400;
    throw err;
  }

  const pool = getMysqlPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [reservationRows] = await connection.query<RowDataPacket[]>(
      `SELECT id, center_id, staff_id, status
         FROM reservations
        WHERE id = ?
        FOR UPDATE`,
      [input.reservationId]
    );
    const reservation = reservationRows[0];
    if (!reservation) {
      const err = new Error("Reservation not found");
      (err as { statusCode?: number }).statusCode = 404;
      throw err;
    }
    if (
      reservation.center_id != null &&
      Number(reservation.center_id) > 0 &&
      Number(reservation.center_id) !== Number(input.centerId)
    ) {
      const err = new Error("Reservation belongs to another center");
      (err as { statusCode?: number }).statusCode = 403;
      throw err;
    }

    const staffId =
      Number(input.staffId) > 0
        ? Number(input.staffId)
        : reservation.staff_id != null
          ? Number(reservation.staff_id)
          : null;

    const slotsJson = JSON.stringify(options);
    const { date, time } = firstSlotParts(options);

    let offerId: number | null = null;
    if (staffId) {
      const [offerRows] = await connection.query<RowDataPacket[]>(
        `SELECT id
           FROM centers__offers
          WHERE reservation_id = ?
            AND center_id = ?
            AND staff_id = ?
          ORDER BY id DESC
          LIMIT 1
          FOR UPDATE`,
        [input.reservationId, input.centerId, staffId]
      );
      if (offerRows[0]?.id) {
        offerId = Number(offerRows[0].id);
        await connection.execute(
          `UPDATE centers__offers
              SET proposed_slots = ?,
                  proposed_date = COALESCE(?, proposed_date),
                  proposed_time = COALESCE(?, proposed_time)
            WHERE id = ?`,
          [slotsJson, date, time, offerId]
        );
      } else {
        // Fall back to latest center offer on this reservation (staff may differ).
        const [anyOffer] = await connection.query<RowDataPacket[]>(
          `SELECT id
             FROM centers__offers
            WHERE reservation_id = ? AND center_id = ?
            ORDER BY id DESC
            LIMIT 1
            FOR UPDATE`,
          [input.reservationId, input.centerId]
        );
        if (anyOffer[0]?.id) {
          offerId = Number(anyOffer[0].id);
          await connection.execute(
            `UPDATE centers__offers
                SET proposed_slots = ?,
                    proposed_date = COALESCE(?, proposed_date),
                    proposed_time = COALESCE(?, proposed_time),
                    staff_id = COALESCE(staff_id, ?)
              WHERE id = ?`,
            [slotsJson, date, time, staffId, offerId]
          );
        }
      }
    } else {
      const [anyOffer] = await connection.query<RowDataPacket[]>(
        `SELECT id
           FROM centers__offers
          WHERE reservation_id = ? AND center_id = ?
          ORDER BY id DESC
          LIMIT 1
          FOR UPDATE`,
        [input.reservationId, input.centerId]
      );
      if (anyOffer[0]?.id) {
        offerId = Number(anyOffer[0].id);
        await connection.execute(
          `UPDATE centers__offers
              SET proposed_slots = ?,
                  proposed_date = COALESCE(?, proposed_date),
                  proposed_time = COALESCE(?, proposed_time)
            WHERE id = ?`,
          [slotsJson, date, time, offerId]
        );
      }
    }

    const [lifecycleRows] = await connection.query<RowDataPacket[]>(
      `SELECT stage FROM reservations__lifecycle WHERE reservation_id = ?`,
      [input.reservationId]
    );
    const existingStage = lifecycleRows[0]?.stage
      ? String(lifecycleRows[0].stage)
      : null;
    const nextStage =
      existingStage && existingStage !== "awaiting_interview"
        ? existingStage
        : "awaiting_interview";

    await connection.execute(
      `INSERT INTO reservations__lifecycle
         (reservation_id, stage, selected_offer_id, interview_options)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         interview_options = VALUES(interview_options),
         selected_offer_id = COALESCE(VALUES(selected_offer_id), selected_offer_id),
         stage = VALUES(stage)`,
      [input.reservationId, nextStage, offerId, slotsJson]
    );

    await connection.commit();
    return loadNurseInterviewSlotsState({
      reservationId: input.reservationId,
      centerId: input.centerId
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
