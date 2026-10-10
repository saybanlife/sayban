import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { getMysqlPool } from "./mysqlPool";
import type {
  SupportConversation,
  SupportListStatusFilter,
  SupportMessage,
  SupportStatus
} from "../../../components/support/supportTypes";

function sqlError(message: string, statusCode = 400) {
  const err = new Error(message);
  (err as any).statusCode = statusCode;
  return err;
}

function mapConversation(row: RowDataPacket): SupportConversation {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    status: row.status as SupportStatus,
    last_message: row.last_message ?? null,
    last_message_at: row.last_message_at
      ? String(row.last_message_at)
      : null,
    message_count: row.message_count != null ? Number(row.message_count) : 0,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
    closed_at: row.closed_at ? String(row.closed_at) : null,
    user_name: row.user_name ?? null,
    user_mobile: row.user_mobile ?? null
  };
}

function mapMessage(row: RowDataPacket): SupportMessage {
  return {
    id: Number(row.id),
    conversation_id: Number(row.conversation_id),
    sender_id: Number(row.sender_id),
    sender_type: row.sender_type as SupportMessage["sender_type"],
    message: String(row.message ?? ""),
    attachment_url: row.attachment_url ?? null,
    created_at: row.created_at ? String(row.created_at) : undefined,
    updated_at: row.updated_at ? String(row.updated_at) : undefined
  };
}

async function ensureOwnConversation(userId: number, conversationId: number) {
  const pool = getMysqlPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id FROM support__conversations WHERE id = ? AND user_id = ? LIMIT 1`,
    [conversationId, userId]
  );
  if (!rows[0]) throw sqlError("Conversation not found", 404);
}

export async function userCreateConversation(userId: number, message: string) {
  const text = String(message || "").trim();
  if (!text) throw sqlError("message required");

  const pool = getMysqlPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [insertConv] = await conn.query<ResultSetHeader>(
      `INSERT INTO support__conversations
        (user_id, status, last_message, last_message_at, message_count)
       VALUES (?, 'open', ?, NOW(), 1)`,
      [userId, text]
    );
    const conversationId = insertConv.insertId;
    await conn.query(
      `INSERT INTO support__messages
        (conversation_id, sender_id, sender_type, message)
       VALUES (?, ?, 'user', ?)`,
      [conversationId, userId, text]
    );
    await conn.commit();

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, user_id, status, last_message, last_message_at, message_count,
              created_at, updated_at, closed_at
       FROM support__conversations WHERE id = ? LIMIT 1`,
      [conversationId]
    );
    return mapConversation(rows[0]);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function userListConversations(userId: number) {
  const pool = getMysqlPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, user_id, status, last_message, last_message_at, message_count,
            created_at, updated_at, closed_at
     FROM support__conversations
     WHERE user_id = ?
     ORDER BY updated_at DESC, id DESC`,
    [userId]
  );
  return rows.map(mapConversation);
}

export async function userGetMessages(userId: number, conversationId: number) {
  await ensureOwnConversation(userId, conversationId);
  const pool = getMysqlPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, conversation_id, sender_id, sender_type, message, attachment_url,
            created_at, updated_at
     FROM support__messages
     WHERE conversation_id = ?
     ORDER BY id ASC`,
    [conversationId]
  );
  return rows.map(mapMessage);
}

export async function userSendMessage(
  userId: number,
  conversationId: number,
  message: string,
  attachmentUrl?: string | null
) {
  const text = String(message || "").trim();
  if (!text) throw sqlError("message required");
  await ensureOwnConversation(userId, conversationId);

  const pool = getMysqlPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO support__messages
        (conversation_id, sender_id, sender_type, message, attachment_url)
       VALUES (?, ?, 'user', ?, ?)`,
      [conversationId, userId, text, attachmentUrl ?? null]
    );
    await conn.query(
      `UPDATE support__conversations
       SET last_message = ?, last_message_at = NOW(),
           message_count = message_count + 1,
           status = IF(status = 'closed', 'closed', 'pending'),
           updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [text, conversationId, userId]
    );
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, conversation_id, sender_id, sender_type, message, attachment_url,
            created_at, updated_at
     FROM support__messages
     WHERE conversation_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [conversationId]
  );
  if (!rows[0]) throw sqlError("Failed to load created message", 500);
  return mapMessage(rows[0]);
}

export async function userCloseConversation(userId: number, conversationId: number) {
  await ensureOwnConversation(userId, conversationId);
  const pool = getMysqlPool();
  await pool.query(
    `UPDATE support__conversations
     SET status = 'closed', closed_at = NOW(), updated_at = NOW()
     WHERE id = ? AND user_id = ?`,
    [conversationId, userId]
  );
  return { closed: true };
}

export async function panelListConversations(params: {
  status?: SupportListStatusFilter;
  q?: string;
}) {
  const pool = getMysqlPool();
  const filters: string[] = [];
  const values: unknown[] = [];

  if (params.status && params.status !== "all") {
    if (params.status === "unanswered") {
      filters.push("c.status IN ('open', 'pending')");
    } else {
      filters.push("c.status = ?");
      values.push(params.status);
    }
  }
  if (params.q?.trim()) {
    const q = `%${params.q.trim()}%`;
    filters.push(
      "(CAST(c.user_id AS CHAR) LIKE ? OR c.last_message LIKE ? OR u.name LIKE ? OR u.mobile LIKE ?)"
    );
    values.push(q, q, q, q);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT c.id, c.user_id, c.status, c.last_message, c.last_message_at, c.message_count,
            c.created_at, c.updated_at, c.closed_at,
            u.name AS user_name, u.mobile AS user_mobile
     FROM support__conversations c
     LEFT JOIN users u ON u.id = c.user_id
     ${where}
     ORDER BY c.updated_at DESC, c.id DESC`,
    values
  );
  return rows.map(mapConversation);
}

export async function panelGetMessages(conversationId: number) {
  const pool = getMysqlPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, conversation_id, sender_id, sender_type, message, attachment_url,
            created_at, updated_at
     FROM support__messages
     WHERE conversation_id = ?
     ORDER BY id ASC`,
    [conversationId]
  );
  return rows.map(mapMessage);
}

export async function panelReply(
  adminId: number,
  conversationId: number,
  message: string
) {
  const text = String(message || "").trim();
  if (!text) throw sqlError("message required");

  const pool = getMysqlPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [convRows] = await conn.query<RowDataPacket[]>(
      `SELECT id, user_id FROM support__conversations WHERE id = ? LIMIT 1`,
      [conversationId]
    );
    const conv = convRows[0];
    if (!conv) throw sqlError("Conversation not found", 404);

    await conn.query(
      `INSERT INTO support__messages
        (conversation_id, sender_id, sender_type, message)
       VALUES (?, ?, 'superadmin', ?)`,
      [conversationId, adminId, text]
    );
    await conn.query(
      `UPDATE support__conversations
       SET last_message = ?, last_message_at = NOW(),
           message_count = message_count + 1, status = 'answered', updated_at = NOW()
       WHERE id = ?`,
      [text, conversationId]
    );
    await conn.query(
      `INSERT INTO users__notification (userId, title, text, action, notification_type)
       VALUES (?, 'پاسخ پشتیبانی', ?, 'support', 'system')`,
      [conv.user_id, text.slice(0, 500)]
    );
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, conversation_id, sender_id, sender_type, message, attachment_url,
            created_at, updated_at
     FROM support__messages
     WHERE conversation_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [conversationId]
  );
  return mapMessage(rows[0]);
}

export async function panelChangeStatus(
  conversationId: number,
  status: SupportStatus
) {
  const pool = getMysqlPool();
  await pool.query(
    `UPDATE support__conversations
     SET status = ?, updated_at = NOW(),
         closed_at = IF(? = 'closed', NOW(), closed_at)
     WHERE id = ?`,
    [status, status, conversationId]
  );
  return { status };
}

export async function panelCloseConversation(conversationId: number) {
  return panelChangeStatus(conversationId, "closed");
}

export type SupportCallbackRow = {
  id: number;
  user_id: number;
  phone: string;
  time_preference: "anytime" | "specific";
  preferred_time: string | null;
  source: string | null;
  created_at?: string;
  user_name?: string | null;
  user_mobile?: string | null;
};

function mapCallback(row: RowDataPacket): SupportCallbackRow {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    phone: String(row.phone ?? ""),
    time_preference:
      row.time_preference === "specific" ? "specific" : "anytime",
    preferred_time: row.preferred_time != null ? String(row.preferred_time) : null,
    source: row.source != null ? String(row.source) : null,
    created_at: row.created_at ? String(row.created_at) : undefined,
    user_name: row.user_name ?? null,
    user_mobile: row.user_mobile ?? null
  };
}

export async function userCreateCallbackRequest(input: {
  userId: number;
  phone: string;
  timePreference?: "anytime" | "specific";
  preferredTime?: string | null;
  source?: string | null;
}) {
  const phone = String(input.phone || "").replace(/\D/g, "");
  if (!/^09\d{9}$/.test(phone)) {
    throw sqlError("شماره تماس معتبر نیست.");
  }
  const timePreference =
    input.timePreference === "specific" ? "specific" : "anytime";
  let preferredTime: string | null = null;
  if (timePreference === "specific") {
    const match = String(input.preferredTime || "")
      .trim()
      .match(/^(\d{1,2}):(\d{2})$/);
    if (!match) throw sqlError("ساعت تماس را مشخص کنید.");
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      throw sqlError("ساعت تماس معتبر نیست.");
    }
    preferredTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const pool = getMysqlPool();
  const [insert] = await pool.query<ResultSetHeader>(
    `INSERT INTO support__callback_requests
      (user_id, phone, time_preference, preferred_time, source)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.userId,
      phone,
      timePreference,
      preferredTime,
      String(input.source || "nurse_request").slice(0, 64)
    ]
  );

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, user_id, phone, time_preference, preferred_time, source, created_at
     FROM support__callback_requests
     WHERE id = ?
     LIMIT 1`,
    [insert.insertId]
  );
  return mapCallback(rows[0]);
}

export async function panelListCallbackRequests(limit = 200) {
  const pool = getMysqlPool();
  const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 500);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT c.id, c.user_id, c.phone, c.time_preference, c.preferred_time,
            c.source, c.created_at,
            u.name AS user_name, u.mobile AS user_mobile
     FROM support__callback_requests c
     LEFT JOIN users u ON u.id = c.user_id
     ORDER BY c.created_at DESC
     LIMIT ${safeLimit}`
  );
  return rows.map(mapCallback);
}
