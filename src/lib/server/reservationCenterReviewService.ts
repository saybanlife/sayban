import type { RowDataPacket } from "mysql2/promise";

import { resolveApiUrl, PUBLIC_ROUTES } from "@/lib/apiRoutes";
import { getMysqlPool } from "./mysqlPool";
import {
  mergeReviewIntoMeta,
  parseVisitPostVisitMeta,
  serializeVisitPostVisitMeta,
  type VisitPostVisitMeta
} from "../../../components/reservation/visitPostVisitModel";

export type SubmitCenterReviewInput = {
  reservationId: number;
  userId: number;
  authHeader: string;
  centerId: number;
  rate: number;
  comment: string;
  privateComment?: string;
  contractSigned?: boolean;
  declineReason?: string | null;
  supportRequested?: boolean;
};

async function loadReservationCenter(
  reservationId: number,
  userId: number
): Promise<{ center_id: number } | null> {
  const [rows] = await getMysqlPool().query<RowDataPacket[]>(
    `SELECT center_id FROM reservations WHERE id = ? AND user_id = ? LIMIT 1`,
    [reservationId, userId]
  );
  const row = rows[0];
  const centerId = Number(row?.center_id);
  if (!Number.isInteger(centerId) || centerId <= 0) return null;
  return { center_id: centerId };
}

async function readVisitMeta(
  reservationId: number
): Promise<VisitPostVisitMeta | null> {
  const [rows] = await getMysqlPool().query<RowDataPacket[]>(
    `SELECT visit_post_visit_meta FROM reservations__lifecycle WHERE reservation_id = ? LIMIT 1`,
    [reservationId]
  );
  return parseVisitPostVisitMeta(rows[0]?.visit_post_visit_meta);
}

async function writeVisitMeta(
  reservationId: number,
  meta: VisitPostVisitMeta
): Promise<void> {
  const payload = serializeVisitPostVisitMeta(meta);
  await getMysqlPool().execute(
    `INSERT INTO reservations__lifecycle (reservation_id, visit_post_visit_meta)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE visit_post_visit_meta = VALUES(visit_post_visit_meta)`,
    [reservationId, payload]
  );
}

export async function saveVisitContractFeedback(
  reservationId: number,
  userId: number,
  input: {
    contractSigned: boolean;
    declineReason?: string | null;
    supportRequested?: boolean;
  }
) {
  const reservation = await loadReservationCenter(reservationId, userId);
  if (!reservation) {
    throw Object.assign(new Error("Reservation not found"), { statusCode: 404 });
  }
  const next = mergeReviewIntoMeta(await readVisitMeta(reservationId), {
    contract_signed: input.contractSigned,
    decline_reason: input.declineReason ?? null,
    support_requested: input.supportRequested ?? false
  });
  await writeVisitMeta(reservationId, next);
  return next;
}

export async function submitReservationCenterReview(
  input: SubmitCenterReviewInput
) {
  const reservation = await loadReservationCenter(
    input.reservationId,
    input.userId
  );
  if (!reservation || reservation.center_id !== input.centerId) {
    throw Object.assign(new Error("Reservation not found"), { statusCode: 404 });
  }

  const upstream = await fetch(resolveApiUrl(PUBLIC_ROUTES.setComment), {
    method: "POST",
    headers: {
      Authorization: input.authHeader,
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      center_id: input.centerId,
      rate: input.rate,
      comment: input.comment
    })
  });
  const payload = await upstream.json().catch(() => null);
  if (!upstream.ok || payload?.success === false) {
    throw Object.assign(
      new Error(payload?.message || "ثبت نظر ناموفق بود."),
      { statusCode: upstream.status || 502 }
    );
  }

  try {
    const [rows] = await getMysqlPool().query<RowDataPacket[]>(
      `SELECT id FROM centers__reviews
        WHERE user_id = ? AND center_id = ?
        ORDER BY id DESC LIMIT 1`,
      [input.userId, input.centerId]
    );
    const reviewId = Number(rows[0]?.id);
    if (Number.isInteger(reviewId) && reviewId > 0) {
      await getMysqlPool().execute(
        `UPDATE centers__reviews
            SET private_comment = COALESCE(?, private_comment),
                reservation_id = COALESCE(?, reservation_id)
          WHERE id = ? AND user_id = ?`,
        [
          input.privateComment || null,
          input.reservationId,
          reviewId,
          input.userId
        ]
      );
    }
  } catch (error) {
    console.warn("[center-review] optional DB enrich failed", error);
  }

  const meta = mergeReviewIntoMeta(await readVisitMeta(input.reservationId), {
    contract_signed:
      typeof input.contractSigned === "boolean"
        ? input.contractSigned
        : undefined,
    decline_reason: input.declineReason ?? undefined,
    support_requested: input.supportRequested,
    review_submitted_at: new Date().toISOString()
  });
  try {
    await writeVisitMeta(input.reservationId, meta);
  } catch (error) {
    console.warn("[center-review] visit meta update failed", error);
  }

  return { success: true, meta };
}
