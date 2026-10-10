import type { NextApiRequest, NextApiResponse } from "next";
import { resolveApiUrl, PUBLIC_ROUTES } from "@/lib/apiRoutes";
import { isMysqlConfigured } from "@/lib/server/mysqlPool";
import {
  loadCenterBaseRecord,
  loadCenterProfileEnrichment,
  mergeCenterPublicResult,
  type CenterProfileEnrichment
} from "@/lib/server/centerPublicService";
import { runPmaSql } from "@/lib/server/pmaSql";

function authHeader(req: NextApiRequest) {
  const h = req.headers.authorization || req.headers.Authorization;
  return typeof h === "string" ? h : "";
}

function decodeEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    )
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function decodePmaField(value: string) {
  let text = decodeEntities(String(value || "")).trim();
  if (/\\u[0-9a-f]{4}/i.test(text)) {
    text = text.replace(/\\u([0-9a-f]{4})/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
  }
  return text;
}

/** PMA fallback when direct MySQL pool is unavailable in dev. */
async function loadCenterBaseRecordViaPma(
  centerId: number
): Promise<Record<string, unknown> | null> {
  const sql = `SELECT CONCAT('~CTR~', id, '~', REPLACE(COALESCE(name,''),'~',' '), '~', COALESCE(main_image,''), '~', COALESCE(banner_image,''), '~END~') AS row_line FROM centers WHERE id = ${centerId} AND deleted_at IS NULL LIMIT 1`;
  const res = await runPmaSql(sql);
  if (!res.success) return null;
  const marker = pmaText(res).match(/~CTR~(\d+)~([^~]*)~([^~]*)~([^~]*)~END~/);
  if (!marker) return null;
  const main_image = decodePmaField(marker[3]);
  return {
    id: Number(marker[1]),
    name: decodePmaField(marker[2]),
    main_image,
    banner_image: decodePmaField(marker[4]),
    image: main_image ? [{ image_url: main_image }] : []
  };
}
function emptyEnrichment(): CenterProfileEnrichment {
  return {
    daily_schedule: null,
    activities: [],
    care_items: [],
    specialists: [],
    visit_policy: null,
    amenities: [],
    faqs: [],
    working_hours_rows: [],
    working_hours: "",
    staff: []
  };
}

function pmaText(res: { text?: string; body?: string }) {
  let text = decodeEntities(`${res.text || ""}\n${res.body || ""}`);
  try {
    const start = String(res.body || "").indexOf("{");
    if (start >= 0) {
      const parsed = JSON.parse(String(res.body).slice(start)) as {
        message?: string;
      };
      if (parsed.message) {
        text = `${text}\n${decodeEntities(parsed.message)}`;
      }
    }
  } catch {
    // ignore JSON parse errors; fall back to raw text
  }
  return text;
}

async function loadCenterProfileEnrichmentViaPma(
  centerId: number
): Promise<CenterProfileEnrichment> {
  const enrichment = emptyEnrichment();

  const scheduleSql = `SELECT CONCAT('~DS~', COALESCE(wake_time,''), '~', COALESCE(sleep_time,''), '~', COALESCE(REPLACE(daily_routine_desc,'~',' '), ''), '~', COALESCE(weekly_schedule_sample,''), '~END~') AS row_line FROM centers__daily_schedule WHERE center_id = ${centerId} LIMIT 1`;

  const activitiesSql = `SELECT CONCAT('~ACT~', a.id, '~', COALESCE(a.name,''), '~', COALESCE(a.slug,''), '~', COALESCE(a.icon,''), '~', COALESCE(a.sort_order,0), '~', COALESCE(REPLACE(ca.note,'~',' '), ''), '~END~') AS row_line FROM centers__activities ca INNER JOIN activities a ON a.id = ca.activity_id WHERE ca.center_id = ${centerId} AND a.is_active = 1 ORDER BY a.sort_order ASC, a.id ASC`;

  const amenitiesSql = `SELECT CONCAT('~AM~', a.id, '~', COALESCE(a.name,''), '~', COALESCE(a.icon,''), '~', COALESCE(a.description,''), '~END~') AS row_line FROM centers__amenities ca INNER JOIN amenities a ON a.id = ca.amenity_id WHERE ca.center_id = ${centerId} AND a.is_active = 1 ORDER BY a.sort_order ASC, a.id ASC`;

  const faqsSql = `SELECT CONCAT('~FAQ~', id, '~', COALESCE(question,''), '~', COALESCE(REPLACE(answer,'~',' '), ''), '~END~') AS row_line FROM centers__faqs WHERE center_id = ${centerId} AND COALESCE(is_active, 1) = 1 ORDER BY sort_order ASC, id ASC`;

  const staffSql = `SELECT CONCAT('§ST§', id, '§', center_id, '§', REPLACE(COALESCE(name,''),'§',' '), '§', COALESCE(gender,''), '§', COALESCE(type,''), '§', COALESCE(experience_years,0), '§', COALESCE(rating,0), '§', COALESCE(no_criminal_record,0), '§END§') AS row_line FROM centers__staffs WHERE center_id = ${centerId} AND COALESCE(is_active, 1) = 1 ORDER BY rating DESC, experience_years DESC, id ASC`;

  const [scheduleRes, activitiesRes, amenitiesRes, faqsRes, staffRes] = [
    await runPmaSql(scheduleSql).catch(() => ({ success: false, text: "", body: "" })),
    await runPmaSql(activitiesSql).catch(() => ({ success: false, text: "", body: "" })),
    await runPmaSql(amenitiesSql).catch(() => ({ success: false, text: "", body: "" })),
    await runPmaSql(faqsSql).catch(() => ({ success: false, text: "", body: "" })),
    await runPmaSql(staffSql).catch(() => ({ success: false, text: "", body: "" }))
  ];

  const scheduleText = pmaText(scheduleRes);
  const scheduleMatch = scheduleText.match(
    /~DS~([^~]*)~([^~]*)~([^~]*)~([^~]*)~END~/
  );
  if (scheduleMatch) {
    enrichment.daily_schedule = {
      center_id: centerId,
      wake_time: decodePmaField(scheduleMatch[1]) || null,
      sleep_time: decodePmaField(scheduleMatch[2]) || null,
      daily_routine_desc: decodePmaField(scheduleMatch[3]) || null,
      weekly_schedule_sample: decodePmaField(scheduleMatch[4]) || null,
      allows_family_participation: false,
      has_special_needs_program: false,
      updated_at: null
    };
  }

  const activitiesText = pmaText(activitiesRes);
  const actRe = /~ACT~(\d+)~([^~]*)~([^~]*)~([^~]*)~(\d+)~([^~]*)~END~/g;
  let actMatch: RegExpExecArray | null;
  while ((actMatch = actRe.exec(activitiesText))) {
    enrichment.activities.push({
      id: Number(actMatch[1]),
      name: decodePmaField(actMatch[2]),
      slug: decodePmaField(actMatch[3]) || null,
      icon: decodePmaField(actMatch[4]) || null,
      sort_order: Number(actMatch[5] || 0),
      note: decodePmaField(actMatch[6]) || null
    });
  }

  const amenitiesText = pmaText(amenitiesRes);
  const amRe = /~AM~(\d+)~([^~]*)~([^~]*)~([^~]*)~END~/g;
  let amMatch: RegExpExecArray | null;
  while ((amMatch = amRe.exec(amenitiesText))) {
    enrichment.amenities.push({
      id: Number(amMatch[1]),
      name: amMatch[2] || "",
      slug: null,
      icon: amMatch[3] || null,
      description: amMatch[4] || null,
      sort_order: 0
    });
  }

  const faqsText = pmaText(faqsRes);
  const faqRe = /~FAQ~(\d+)~([^~]*)~([^~]*)~END~/g;
  let faqMatch: RegExpExecArray | null;
  while ((faqMatch = faqRe.exec(faqsText))) {
    enrichment.faqs.push({
      id: Number(faqMatch[1]),
      question: faqMatch[2] || "",
      answer: faqMatch[3] || "",
      sort_order: 0
    });
  }

  const staffText = pmaText(staffRes);
  // Avatar omitted here: PMA Partial-text mode truncates long URLs and drops §END§.
  // Direct MySQL enrichment still returns full avatar URLs.
  const staffRe =
    /§ST§(\d+)§(\d+)§([^§]*)§([^§]*)§([^§]*)§([^§]*)§([^§]*)§([^§]*)§END§/g;
  const seenStaff = new Set<number>();
  let staffMatch: RegExpExecArray | null;
  while ((staffMatch = staffRe.exec(staffText))) {
    const id = Number(staffMatch[1]);
    const name = decodePmaField(staffMatch[3]);
    if (!Number.isFinite(id) || id <= 0 || !name || seenStaff.has(id)) continue;
    seenStaff.add(id);
    enrichment.staff.push({
      id,
      center_id: Number(staffMatch[2]) || centerId,
      name,
      gender: decodePmaField(staffMatch[4]),
      type: decodePmaField(staffMatch[5]),
      experience_years: Number(staffMatch[6] || 0) || 0,
      rating: Number(staffMatch[7] || 0) || 0,
      no_criminal_record:
        staffMatch[8] === "1" || staffMatch[8] === "true",
      avatar: ""
    });
  }

  return enrichment;
}

async function buildPublicCenterResponse(centerId: number) {
  try {
    let result =
      (await loadCenterBaseRecord(centerId)) ||
      (await loadCenterBaseRecordViaPma(centerId));
    if (!result) return null;

    try {
      const enrichment = isMysqlConfigured()
        ? await loadCenterProfileEnrichment(centerId)
        : await loadCenterProfileEnrichmentViaPma(centerId);
      result = mergeCenterPublicResult(result, enrichment);
    } catch (error) {
      console.error("[api/center] enrichment failed (fallback path)", error);
    }

    return result;
  } catch (error) {
    console.error("[api/center] public fallback failed", error);
    return null;
  }
}

/**
 * Public center detail:
 * Proxies legacy n8n GET /center/ then enriches with Panel relational tables.
 * When upstream requires auth (panel preview), falls back to DB + enrichment.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const idRaw = req.query.id;
  const id = Array.isArray(idRaw) ? idRaw[0] : idRaw;
  const centerId = Number(id);
  if (!id || !Number.isFinite(centerId) || centerId <= 0) {
    return res.status(400).json({ success: false, message: "id is required" });
  }

  const auth = authHeader(req);
  const upstreamUrl = `${resolveApiUrl(PUBLIC_ROUTES.center)}?id=${encodeURIComponent(
    String(centerId)
  )}`;

  let upstreamJson: Record<string, unknown> = {};
  let upstreamStatus = 200;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        ...(auth ? { Authorization: auth } : {}),
        Accept: "application/json"
      }
    });
    upstreamStatus = upstream.status;
    const text = await upstream.text();
    if (text) {
      try {
        upstreamJson = JSON.parse(text) as Record<string, unknown>;
      } catch {
        upstreamJson = { message: text.trim() };
      }
    }
    if (!upstream.ok) {
      const canPreviewWithoutAuth =
        upstreamStatus === 401 ||
        upstreamStatus === 403 ||
        !auth.trim();
      if (canPreviewWithoutAuth) {
        const fallback = await buildPublicCenterResponse(centerId);
        if (fallback) {
          return res.status(200).json({ success: true, result: fallback });
        }
      }
      if (text && !text.trim().startsWith("{")) {
        return res.status(upstreamStatus).send(text);
      }
      return res.status(upstreamStatus).json(upstreamJson);
    }
  } catch (error) {
    const fallback = await buildPublicCenterResponse(centerId);
    if (fallback) {
      return res.status(200).json({ success: true, result: fallback });
    }
    return res.status(502).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to reach upstream /center/ webhook"
    });
  }

  // Normalize envelope: some webhooks return { result }, others nest deeper.
  let result: Record<string, unknown> | null = null;
  if (
    upstreamJson &&
    typeof upstreamJson === "object" &&
    upstreamJson.result &&
    typeof upstreamJson.result === "object" &&
    !Array.isArray(upstreamJson.result)
  ) {
    result = upstreamJson.result as Record<string, unknown>;
  } else if (
    upstreamJson &&
    typeof upstreamJson === "object" &&
    (upstreamJson as { data?: { result?: unknown } }).data &&
    typeof (upstreamJson as { data?: { result?: unknown } }).data === "object" &&
    (upstreamJson as { data: { result?: unknown } }).data.result &&
    typeof (upstreamJson as { data: { result?: unknown } }).data.result ===
      "object"
  ) {
    result = (upstreamJson as { data: { result: Record<string, unknown> } })
      .data.result;
  } else if (
    upstreamJson &&
    typeof upstreamJson === "object" &&
    ("id" in upstreamJson || "name" in upstreamJson)
  ) {
    result = upstreamJson;
  }

  // The legacy upstream may omit newly-added center columns. Read the base
  // record and merge only the dedicated banner so custom/default rendering is
  // deterministic in both direct-MySQL and PMA fallback environments.
  const baseRecord =
    (await loadCenterBaseRecord(centerId).catch(() => null)) ||
    (await loadCenterBaseRecordViaPma(centerId).catch(() => null));
  if (result && baseRecord) {
    result = {
      ...result,
      banner_image: baseRecord.banner_image || ""
    };
  }
  if (!result) {
    return res.status(200).json(upstreamJson);
  }

  try {
    const enrichment = isMysqlConfigured()
      ? await loadCenterProfileEnrichment(centerId)
      : await loadCenterProfileEnrichmentViaPma(centerId);
    const merged = mergeCenterPublicResult(result, enrichment);

    if (upstreamJson.result) {
      return res.status(200).json({ ...upstreamJson, result: merged });
    }
    if (
      upstreamJson.data &&
      typeof upstreamJson.data === "object" &&
      !Array.isArray(upstreamJson.data)
    ) {
      return res.status(200).json({
        ...upstreamJson,
        data: {
          ...(upstreamJson.data as Record<string, unknown>),
          result: merged
        }
      });
    }
    return res.status(200).json({ success: true, result: merged });
  } catch (error) {
    console.error("[api/center] enrichment failed", error);
    return res.status(200).json(
      upstreamJson.result ? upstreamJson : { ...upstreamJson, result }
    );
  }
}
