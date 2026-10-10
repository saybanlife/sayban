import type { RowDataPacket } from "mysql2/promise";
import { getMysqlPool, isMysqlConfigured } from "./mysqlPool";

export type PublicDailySchedule = {
  center_id: number;
  wake_time: string | null;
  sleep_time: string | null;
  daily_routine_desc: string | null;
  weekly_schedule_sample: string | null;
  allows_family_participation: boolean;
  has_special_needs_program: boolean;
  updated_at: string | null;
};

export type PublicActivity = {
  id: number;
  name: string;
  slug: string | null;
  icon: string | null;
  sort_order: number;
  note: string | null;
};

export type PublicCareItem = {
  id: number;
  name: string;
  slug: string | null;
  sort_order: number;
  has_it: boolean;
  note: string | null;
};

export type PublicSpecialist = {
  id: number;
  specialist_type: string;
  frequency: string | null;
  doctor_kind: string | null;
  visit_interval: string | null;
  days_of_week: string | null;
  is_active: boolean;
};

export type PublicVisitPolicy = {
  center_id: number;
  visit_days: string | null;
  visit_hours: string | null;
  needs_prior_coordination: boolean;
  max_visitors_count: number | null;
  allows_private_visit: boolean;
  allows_open_space_visit: boolean;
  allows_phone_contact: boolean;
  allows_video_contact: boolean;
  contact_hours: string | null;
  allows_temporary_leave: boolean;
  temporary_leave_conditions: string | null;
  allows_overnight_leave: boolean;
  status_report_method: string | null;
  status_report_frequency: string | null;
  contact_person_role: string | null;
  allows_direct_staff_contact: boolean;
  complaint_method: string | null;
  complaint_response_time: string | null;
  updated_at: string | null;
};

export type PublicAmenity = {
  id: number;
  name: string;
  slug: string | null;
  icon: string | null;
  description: string | null;
  sort_order: number;
  note?: string | null;
};

export type PublicFaq = {
  id: number;
  question: string;
  answer: string;
  sort_order: number;
};

export type PublicWorkingHoursRow = {
  day_of_week: string;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
};

/** Public-safe staff card fields for nursing center profiles. */
export type PublicCenterStaff = {
  id: number;
  center_id: number;
  name: string;
  gender: string;
  type: string;
  experience_years: number;
  avatar: string;
  rating: number;
  no_criminal_record: boolean;
};

export type CenterProfileEnrichment = {
  daily_schedule: PublicDailySchedule | null;
  activities: PublicActivity[];
  care_items: PublicCareItem[];
  specialists: PublicSpecialist[];
  visit_policy: PublicVisitPolicy | null;
  amenities: PublicAmenity[];
  faqs: PublicFaq[];
  working_hours_rows: PublicWorkingHoursRow[];
  working_hours: string;
  staff: PublicCenterStaff[];
};

function asBool(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const n = String(value ?? "")
    .trim()
    .toLowerCase();
  return ["1", "true", "yes", "بله", "آری"].includes(n);
}

function trimTime(value: unknown) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  // HH:MM:SS → HH:MM
  const m = text.match(/^(\d{1,2}:\d{2})(?::\d{2})?/);
  return m ? m[1] : text;
}

const DAY_LABEL_FA: Record<string, string> = {
  sat: "شنبه",
  saturday: "شنبه",
  sun: "یکشنبه",
  sunday: "یکشنبه",
  mon: "دوشنبه",
  monday: "دوشنبه",
  tue: "سه‌شنبه",
  tuesday: "سه‌شنبه",
  wed: "چهارشنبه",
  wednesday: "چهارشنبه",
  thu: "پنج‌شنبه",
  thursday: "پنج‌شنبه",
  fri: "جمعه",
  friday: "جمعه"
};

function formatWorkingHoursLine(row: PublicWorkingHoursRow) {
  const dayKey = String(row.day_of_week || "")
    .trim()
    .toLowerCase();
  const day = DAY_LABEL_FA[dayKey] || row.day_of_week || "روز";
  if (row.is_closed) return `${day}: تعطیل`;
  const open = trimTime(row.open_time);
  const close = trimTime(row.close_time);
  if (!open && !close) return "";
  return `${day} ${open || "—"} — ${close || "—"}`;
}

export function formatWorkingHoursString(rows: PublicWorkingHoursRow[]) {
  return rows
    .map(formatWorkingHoursLine)
    .filter(Boolean)
    .join("\n");
}

/** Minimal public center row when upstream /center/ rejects unauthenticated preview. */
export async function loadCenterBaseRecord(
  centerId: number
): Promise<Record<string, unknown> | null> {
  if (!isMysqlConfigured()) return null;
  const pool = getMysqlPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, name, description, address, state, city, area,
            latitude, longitude, phone, email, website, instagram_url,
            website_url, main_image, banner_image, logo, center_type, care_domain,
            admission_gender,
            total_capacity, founded_year, care_staff_count,
            active_staff_count, min_work_experience_value, min_work_experience_unit,
            dispatch_tehran_districts, dispatch_lead_time, urgent_dispatch,
            activity_days, response_hours_start, response_hours_end,
            working_hours,
            rating_avg, reviews_count, min_monthly_fee, max_monthly_fee,
            has_night_nurse, distance_to_hospital_km, doctor_type,
            caregiver_type, room_types, dispatch_workforce_types, license_type,
            doctor_visit_schedule
     FROM centers
     WHERE id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [centerId]
  );
  const row = rows[0];
  if (!row) return null;

  const [imageRows] = await pool.query<RowDataPacket[]>(
    `SELECT image_url
     FROM centers__images
     WHERE center_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [centerId]
  ).catch(() => [[] as RowDataPacket[]]);

  const mainImage =
    row.main_image != null ? String(row.main_image).trim() : "";
  const gallery = imageRows
    .map(r => ({
      image_url: r.image_url != null ? String(r.image_url) : ""
    }))
    .filter(r => r.image_url);

  return {
    id: Number(row.id),
    name: String(row.name || ""),
    description: row.description != null ? String(row.description) : "",
    address: row.address != null ? String(row.address) : "",
    state: row.state != null ? String(row.state) : "",
    city: row.city != null ? String(row.city) : "",
    area: row.area != null ? String(row.area) : "",
    latitude: row.latitude,
    longitude: row.longitude,
    phone: row.phone != null ? String(row.phone) : "",
    email: row.email != null ? String(row.email) : "",
    website: row.website != null ? String(row.website) : "",
    instagram_url:
      row.instagram_url != null ? String(row.instagram_url) : "",
    website_url: row.website_url != null ? String(row.website_url) : "",
    main_image: mainImage,
    banner_image: row.banner_image != null ? String(row.banner_image).trim() : "",
    // Selected since the column was added but never exposed, so a freshly
    // uploaded center logo had no way to reach the public page.
    logo: row.logo != null ? String(row.logo).trim() : "",
    image:
      gallery.length > 0
        ? gallery
        : mainImage
          ? [{ image_url: mainImage }]
          : [],
    center_type: row.center_type,
    care_domain: row.care_domain,
    admission_gender: row.admission_gender,
    total_capacity: row.total_capacity,
    founded_year: row.founded_year,
    care_staff_count: row.care_staff_count,
    active_staff_count: row.active_staff_count,
    min_work_experience_value: row.min_work_experience_value,
    min_work_experience_unit: row.min_work_experience_unit,
    dispatch_tehran_districts: row.dispatch_tehran_districts,
    dispatch_lead_time: row.dispatch_lead_time,
    urgent_dispatch: row.urgent_dispatch,
    activity_days: row.activity_days,
    response_hours_start:
      row.response_hours_start != null
        ? String(row.response_hours_start)
        : "",
    response_hours_end:
      row.response_hours_end != null ? String(row.response_hours_end) : "",
    working_hours:
      row.working_hours != null ? String(row.working_hours) : "",
    rating_avg: row.rating_avg,
    reviews_count: row.reviews_count,
    min_monthly_fee: row.min_monthly_fee,
    max_monthly_fee: row.max_monthly_fee,
    has_night_nurse: row.has_night_nurse,
    distance_to_hospital_km: row.distance_to_hospital_km,
    doctor_type: row.doctor_type,
    caregiver_type: row.caregiver_type,
    room_types: row.room_types,
    dispatch_workforce_types: row.dispatch_workforce_types,
    license_type: row.license_type,
    doctor_visit_schedule: row.doctor_visit_schedule
  };
}

export async function loadCenterProfileEnrichment(
  centerId: number
): Promise<CenterProfileEnrichment> {
  if (!isMysqlConfigured()) {
    throw new Error("MySQL is not configured");
  }
  const pool = getMysqlPool();

  const [
    scheduleRows,
    activityRows,
    careRows,
    specialistRows,
    visitRows,
    amenityRows,
    faqRows,
    hoursRows,
    staffRows
  ] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `SELECT center_id, wake_time, sleep_time, daily_routine_desc,
              weekly_schedule_sample, allows_family_participation,
              has_special_needs_program, updated_at
       FROM centers__daily_schedule
       WHERE center_id = ?
       LIMIT 1`,
      [centerId]
    ),
    pool.query<RowDataPacket[]>(
      `SELECT a.id, a.name, a.slug, a.icon, a.sort_order, ca.note
       FROM centers__activities ca
       INNER JOIN activities a ON a.id = ca.activity_id
       WHERE ca.center_id = ? AND a.is_active = 1
       ORDER BY a.sort_order ASC, a.id ASC`,
      [centerId]
    ),
    pool.query<RowDataPacket[]>(
      `SELECT ci.id, ci.name, ci.slug, ci.sort_order,
              COALESCE(v.has_it, 0) AS has_it, v.note
       FROM centers__care_items ci
       INNER JOIN centers__care_item_values v
         ON v.care_item_id = ci.id AND v.center_id = ?
       WHERE ci.is_active = 1 AND COALESCE(v.has_it, 0) = 1
       ORDER BY ci.sort_order ASC, ci.id ASC`,
      [centerId]
    ),
    pool.query<RowDataPacket[]>(
      `SELECT id, specialist_type, frequency, doctor_kind, visit_interval,
              days_of_week, is_active
       FROM centers__specialists
       WHERE center_id = ? AND COALESCE(is_active, 1) = 1
       ORDER BY id ASC`,
      [centerId]
    ),
    pool.query<RowDataPacket[]>(
      `SELECT center_id, visit_days, visit_hours, needs_prior_coordination,
              max_visitors_count, allows_private_visit, allows_open_space_visit,
              allows_phone_contact, allows_video_contact, contact_hours,
              allows_temporary_leave, temporary_leave_conditions, allows_overnight_leave,
              status_report_method, status_report_frequency, contact_person_role,
              allows_direct_staff_contact, complaint_method, complaint_response_time,
              updated_at
       FROM centers__visit_policy
       WHERE center_id = ?
       LIMIT 1`,
      [centerId]
    ),
    pool.query<RowDataPacket[]>(
      `SELECT a.id, a.name, a.slug, a.icon, a.description, a.sort_order, ca.note
       FROM centers__amenities ca
       INNER JOIN amenities a ON a.id = ca.amenity_id
       WHERE ca.center_id = ? AND a.is_active = 1
       ORDER BY a.sort_order ASC, a.id ASC`,
      [centerId]
    ),
    pool.query<RowDataPacket[]>(
      `SELECT id, question, answer, sort_order
       FROM centers__faqs
       WHERE center_id = ? AND COALESCE(is_active, 1) = 1
       ORDER BY sort_order ASC, id ASC`,
      [centerId]
    ),
    pool.query<RowDataPacket[]>(
      `SELECT day_of_week, open_time, close_time, is_closed
       FROM centers__working_hours
       WHERE center_id = ? AND service_id IS NULL
       ORDER BY FIELD(day_of_week,'Sat','Sun','Mon','Tue','Wed','Thu','Fri'), id ASC`,
      [centerId]
    ),
    pool.query<RowDataPacket[]>(
      `SELECT id, center_id, name, gender, type, experience_years, avatar,
              rating, no_criminal_record
       FROM centers__staffs
       WHERE center_id = ? AND COALESCE(is_active, 1) = 1
       ORDER BY rating DESC, experience_years DESC, id ASC`,
      [centerId]
    )
  ]);

  const schedule = scheduleRows[0][0];
  const visit = visitRows[0][0];

  const working_hours_rows: PublicWorkingHoursRow[] = hoursRows[0].map(row => ({
    day_of_week: String(row.day_of_week || ""),
    open_time: row.open_time != null ? String(row.open_time) : null,
    close_time: row.close_time != null ? String(row.close_time) : null,
    is_closed: asBool(row.is_closed)
  }));

  return {
    daily_schedule: schedule
      ? {
          center_id: Number(schedule.center_id),
          wake_time: trimTime(schedule.wake_time),
          sleep_time: trimTime(schedule.sleep_time),
          daily_routine_desc:
            schedule.daily_routine_desc != null
              ? String(schedule.daily_routine_desc)
              : null,
          weekly_schedule_sample:
            schedule.weekly_schedule_sample != null
              ? String(schedule.weekly_schedule_sample)
              : null,
          allows_family_participation: asBool(
            schedule.allows_family_participation
          ),
          has_special_needs_program: asBool(schedule.has_special_needs_program),
          updated_at: schedule.updated_at
            ? String(schedule.updated_at)
            : null
        }
      : null,
    activities: activityRows[0].map(row => ({
      id: Number(row.id),
      name: String(row.name || ""),
      slug: row.slug != null ? String(row.slug) : null,
      icon: row.icon != null ? String(row.icon) : null,
      sort_order: Number(row.sort_order || 0),
      note: row.note != null ? String(row.note) : null
    })),
    care_items: careRows[0].map(row => ({
      id: Number(row.id),
      name: String(row.name || ""),
      slug: row.slug != null ? String(row.slug) : null,
      sort_order: Number(row.sort_order || 0),
      has_it: asBool(row.has_it),
      note: row.note != null ? String(row.note) : null
    })),
    specialists: specialistRows[0].map(row => ({
      id: Number(row.id),
      specialist_type: String(row.specialist_type || ""),
      frequency: row.frequency != null ? String(row.frequency) : null,
      doctor_kind: row.doctor_kind != null ? String(row.doctor_kind) : null,
      visit_interval:
        row.visit_interval != null ? String(row.visit_interval) : null,
      days_of_week:
        row.days_of_week != null ? String(row.days_of_week) : null,
      is_active: asBool(row.is_active)
    })),
    visit_policy: visit
      ? {
          center_id: Number(visit.center_id),
          visit_days: visit.visit_days != null ? String(visit.visit_days) : null,
          visit_hours:
            visit.visit_hours != null ? String(visit.visit_hours) : null,
          needs_prior_coordination: asBool(visit.needs_prior_coordination),
          max_visitors_count:
            visit.max_visitors_count != null
              ? Number(visit.max_visitors_count)
              : null,
          allows_private_visit: asBool(visit.allows_private_visit),
          allows_open_space_visit: asBool(visit.allows_open_space_visit),
          allows_phone_contact: asBool(visit.allows_phone_contact),
          allows_video_contact: asBool(visit.allows_video_contact),
          contact_hours:
            visit.contact_hours != null ? String(visit.contact_hours) : null,
          allows_temporary_leave: asBool(visit.allows_temporary_leave),
          temporary_leave_conditions:
            visit.temporary_leave_conditions != null
              ? String(visit.temporary_leave_conditions)
              : null,
          allows_overnight_leave: asBool(visit.allows_overnight_leave),
          status_report_method:
            visit.status_report_method != null
              ? String(visit.status_report_method)
              : null,
          status_report_frequency:
            visit.status_report_frequency != null
              ? String(visit.status_report_frequency)
              : null,
          contact_person_role:
            visit.contact_person_role != null
              ? String(visit.contact_person_role)
              : null,
          allows_direct_staff_contact: asBool(
            visit.allows_direct_staff_contact
          ),
          complaint_method:
            visit.complaint_method != null
              ? String(visit.complaint_method)
              : null,
          complaint_response_time:
            visit.complaint_response_time != null
              ? String(visit.complaint_response_time)
              : null,
          updated_at: visit.updated_at ? String(visit.updated_at) : null
        }
      : null,
    amenities: amenityRows[0].map(row => ({
      id: Number(row.id),
      name: String(row.name || ""),
      slug: row.slug != null ? String(row.slug) : null,
      icon: row.icon != null ? String(row.icon) : null,
      description:
        row.description != null ? String(row.description) : null,
      sort_order: Number(row.sort_order || 0),
      note: row.note != null ? String(row.note) : null
    })),
    faqs: faqRows[0].map(row => ({
      id: Number(row.id),
      question: String(row.question || ""),
      answer: String(row.answer || ""),
      sort_order: Number(row.sort_order || 0)
    })),
    working_hours_rows,
    working_hours: formatWorkingHoursString(working_hours_rows),
    staff: staffRows[0]
      .map(row => ({
        id: Number(row.id),
        center_id: Number(row.center_id),
        name: String(row.name || ""),
        gender: row.gender != null ? String(row.gender) : "",
        type: row.type != null ? String(row.type) : "",
        experience_years: Number(row.experience_years || 0) || 0,
        avatar: row.avatar != null ? String(row.avatar).trim() : "",
        rating: Number(row.rating || 0) || 0,
        no_criminal_record: asBool(row.no_criminal_record)
      }))
      .filter(item => item.id > 0 && item.name)
  };
}

/** Merge enrichment into upstream `/center/` result without dropping core fields. */
export function mergeCenterPublicResult(
  result: Record<string, unknown>,
  enrichment: CenterProfileEnrichment
) {
  const next: Record<string, unknown> = { ...result };

  next.daily_schedule = enrichment.daily_schedule;
  next.activities = enrichment.activities;
  next.care_items = enrichment.care_items;
  next.specialists = enrichment.specialists;
  next.visit_policy = enrichment.visit_policy;
  next.working_hours_rows = enrichment.working_hours_rows;

  const amenities = next.amenities;
  if (!Array.isArray(amenities) || amenities.length === 0) {
    next.amenities = enrichment.amenities;
  }

  const faqs =
    next.faqs || next.faq || next.questions;
  if (!Array.isArray(faqs) || faqs.length === 0) {
    next.faqs = enrichment.faqs;
    next.faq = enrichment.faqs;
  }

  const hours =
    typeof next.working_hours === "string"
      ? next.working_hours.trim()
      : "";
  if (!hours && enrichment.working_hours) {
    next.working_hours = enrichment.working_hours;
  }

  next.staff = enrichment.staff;

  return next;
}
