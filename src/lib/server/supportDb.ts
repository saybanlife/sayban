/**
 * Auth helpers for Support APIs.
 *
 * Runtime Support data goes through `/api/support` (MySQL when configured,
 * otherwise n8n proxy). Do NOT spawn `.cursor/sayban-ops/pma-sql.js`.
 */

export function decodeBearerPayload(authHeader: string | undefined) {
  if (!authHeader) return null;
  const token = String(authHeader).replace(/^Bearer\s+/i, "").trim();
  if (!token || token.split(".").length < 2) return null;
  try {
    const raw = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = raw + "=".repeat((4 - (raw.length % 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function requireUserId(authHeader: string | undefined) {
  const payload = decodeBearerPayload(authHeader);
  if (!payload) {
    const err = new Error("Unauthorized");
    (err as any).statusCode = 401;
    throw err;
  }
  const userId = Number(payload.id ?? payload.userId ?? payload.sub);
  if (!userId) {
    const err = new Error("Unauthorized");
    (err as any).statusCode = 401;
    throw err;
  }
  return { userId, payload };
}

export function requireSuperAdmin(authHeader: string | undefined) {
  const { userId, payload } = requireUserId(authHeader);
  const role = String(payload.role ?? "");
  if (role !== "super_admin") {
    const err = new Error("Forbidden");
    (err as any).statusCode = 403;
    throw err;
  }
  return { adminId: userId, payload };
}

export function requireCenterAdmin(authHeader: string | undefined) {
  const { userId, payload } = requireUserId(authHeader);
  const role = String(payload.role ?? "");
  if (role !== "center_admin") {
    const err = new Error("Forbidden");
    (err as any).statusCode = 403;
    throw err;
  }
  const centerIdRaw = payload.center_id ?? payload.centerId;
  const centerId =
    centerIdRaw != null && String(centerIdRaw).trim() !== ""
      ? Number(centerIdRaw)
      : null;
  return {
    adminId: userId,
    centerId: centerId && Number.isFinite(centerId) ? centerId : null,
    payload
  };
}
