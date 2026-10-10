/**
 * Panel dashboard route constants & payload types for FAQ, amenities,
 * care items, daily life, and visit policy (aligned with faqs n8n workflow).
 */
import { PANEL_ROUTES, resolveApiUrl } from "@/lib/apiRoutes";

export { PANEL_ROUTES, resolveApiUrl };

export type CenterFaqPayload = {
  id?: number;
  center_id: number;
  question: string;
  answer: string;
  sort_order?: number;
  is_active?: number | boolean;
};

export type AmenityLibraryItem = {
  id: number;
  name: string;
  slug?: string;
  icon?: string;
  description?: string;
  sort_order?: number;
};

export type CustomAmenityRequestPayload = {
  center_id: number;
  name: string;
  description?: string;
  requested_by?: number;
};

export type CareItemRow = {
  id: number;
  name: string;
  slug?: string;
  sort_order?: number;
  is_active?: number | boolean;
  has_it?: number | boolean;
  note?: string | null;
};

export type CareItemSyncItem = {
  id: number;
  has_it: boolean;
  note?: string | null;
  /** Per-center display order (0-based). */
  sort_order?: number;
};

export type SpecialistRow = {
  id: number;
  center_id?: number;
  specialist_type: string;
  frequency?: string | null;
  doctor_kind?: string | null;
  visit_interval?: string | null;
  days_of_week?: string | null;
  is_active?: number | boolean;
  sort_order?: number;
  created_at?: string;
};

export type SpecialistPayload = {
  id?: number;
  center_id: number | string;
  specialist_type: string;
  /** Visit cadence: daily | every_other_day | several_times_week. */
  frequency?: string | null;
  /** Doctor entry only: general | specialist. */
  doctor_kind?: string | null;
  /** Free-text visit count or interval, e.g. «هفته‌ای دو بار». */
  visit_interval?: string | null;
  days_of_week?: string;
  is_active?: number | boolean;
  /** Per-center display order (0-based). */
  sort_order?: number;
};

export type DailyScheduleRow = {
  center_id?: number;
  wake_time?: string | null;
  sleep_time?: string | null;
  daily_routine_desc?: string | null;
  weekly_schedule_sample?: string | null;
  allows_family_participation?: number | boolean;
  has_special_needs_program?: number | boolean;
  updated_at?: string;
};

export type DailyScheduleUpdatePayload = {
  center_id: number | string;
  wake_time?: string | null;
  sleep_time?: string | null;
  daily_routine_desc?: string | null;
  weekly_schedule_sample?: string | null;
  allows_family_participation?: boolean;
  has_special_needs_program?: boolean;
};

export type ActivityLibraryItem = {
  id: number;
  name: string;
  slug?: string;
  icon?: string;
  sort_order?: number;
  note?: string | null;
};

export type ActivitySyncItem = {
  id: number;
  note?: string | null;
};

export type VisitPolicyRow = {
  center_id?: number;
  visit_days?: string | null;
  visit_hours?: string | null;
  needs_prior_coordination?: number | boolean;
  max_visitors_count?: number | string | null;
  allows_private_visit?: number | boolean;
  allows_open_space_visit?: number | boolean;
  allows_phone_contact?: number | boolean;
  allows_video_contact?: number | boolean;
  contact_hours?: string | null;
  allows_temporary_leave?: number | boolean;
  temporary_leave_conditions?: string | null;
  allows_overnight_leave?: number | boolean;
  status_report_method?: string | null;
  status_report_frequency?: string | null;
  contact_person_role?: string | null;
  allows_direct_staff_contact?: number | boolean;
  complaint_method?: string | null;
  complaint_response_time?: string | null;
  updated_at?: string;
};

export type VisitPolicyUpdatePayload = {
  center_id: number | string;
  visit_days?: string | null;
  visit_hours?: string | null;
  needs_prior_coordination?: boolean;
  max_visitors_count?: number | null;
  allows_private_visit?: boolean;
  allows_open_space_visit?: boolean;
  allows_phone_contact?: boolean;
  allows_video_contact?: boolean;
  contact_hours?: string | null;
  allows_temporary_leave?: boolean;
  temporary_leave_conditions?: string | null;
  allows_overnight_leave?: boolean;
  status_report_method?: string | null;
  status_report_frequency?: string | null;
  contact_person_role?: string | null;
  allows_direct_staff_contact?: boolean;
  complaint_method?: string | null;
  complaint_response_time?: string | null;
};

export const panelFeatureRoutes = {
  listFaqs: PANEL_ROUTES.faqs,
  createFaq: PANEL_ROUTES.faqsAdd,
  updateFaq: PANEL_ROUTES.faqsUpdate,
  deleteFaq: PANEL_ROUTES.faqsDelete,
  amenitiesLibrary: PANEL_ROUTES.amenitiesLibrary,
  centerAmenities: PANEL_ROUTES.amenities,
  syncAmenities: PANEL_ROUTES.amenitiesSync,
  requestCustomAmenity: PANEL_ROUTES.amenitiesRequest,
  listAmenityRequests: PANEL_ROUTES.amenitiesRequests,
  careItemsLibrary: PANEL_ROUTES.careItemsLibrary,
  careItems: PANEL_ROUTES.careItems,
  careItemsSync: PANEL_ROUTES.careItemsSync,
  specialists: PANEL_ROUTES.specialists,
  specialistsAdd: PANEL_ROUTES.specialistsAdd,
  specialistsUpdate: PANEL_ROUTES.specialistsUpdate,
  specialistsDelete: PANEL_ROUTES.specialistsDelete,
  dailySchedule: PANEL_ROUTES.dailySchedule,
  dailyScheduleUpdate: PANEL_ROUTES.dailyScheduleUpdate,
  activitiesLibrary: PANEL_ROUTES.activitiesLibrary,
  activities: PANEL_ROUTES.activities,
  activitiesSync: PANEL_ROUTES.activitiesSync,
  visitPolicy: PANEL_ROUTES.visitPolicy,
  visitPolicyUpdate: PANEL_ROUTES.visitPolicyUpdate
} as const;

export function asPanelBool(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const n = String(value ?? "")
    .trim()
    .toLowerCase();
  return ["1", "true", "yes", "بله", "آری"].includes(n);
}
