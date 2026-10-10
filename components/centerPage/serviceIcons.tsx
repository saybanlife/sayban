import * as React from "react";
import PlasmicIcon__Stethoscope from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Stethoscope";
import PlasmicIcon__Nurse from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Nurse";
import PlasmicIcon__Physotherapist from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Physotherapist";
import PlasmicIcon__Massage from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Massage";
import PlasmicIcon__Bed from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Bed";
import PlasmicIcon__Trees from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Trees";
import PlasmicIcon__Books from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Books";
import PlasmicIcon__Heart from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Heart";
import PlasmicIcon__Activity from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Activity";
import PlasmicIcon__BuildingHospital from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__BuildingHospital";
import PlasmicIcon__CircleCheck from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__CircleCheck";
import PlasmicIcon__UsersGroup from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__UsersGroup";
import PlasmicIcon__CurrencyIranianRial from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__CurrencyIranianRial";
import PlasmicIcon__ClipboardList from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__ClipboardList";
import PlasmicIcon__Door from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Door";
import PlasmicIcon__UserHeart from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__UserHeart";
import PlasmicIcon__Star from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Star";
import PlasmicIcon__Message from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Message";
import PlasmicIcon__Phone from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Phone";
import PlasmicIcon__Clock from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Clock";
import PlasmicIcon__Moon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Moon";
import PlasmicIcon__MapPin from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__MapPin";
import PlasmicIcon__Home from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Home";
import PlasmicIcon__Calendar from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Calendar";
import PlasmicIcon__BuildingCommunity from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__BuildingCommunity";
import PlasmicIcon__Brain from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Brain";
import PlasmicIcon__MoodSmile from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__MoodSmile";
import PlasmicIcon__Old from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Old";
import PlasmicIcon__Walk from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Walk";
import PlasmicIcon__Dental from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Dental";
import PlasmicIcon__Speakerphone from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Speakerphone";
import PlasmicIcon__Pill from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Pill";
import PlasmicIcon__Apple from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Apple";
import PlasmicIcon__Heartbeat from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Heartbeat";
import PlasmicIcon__FirstAidKit from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__FirstAidKit";
import PlasmicIcon__CalendarEvent from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__CalendarEvent";
import PlasmicIcon__Stretching from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Stretching";
import PlasmicIcon__Friends from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Friends";
import PlasmicIcon__Palette from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Palette";
import PlasmicIcon__Video from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Video";
import PlasmicIcon__HeartHandshake from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__HeartHandshake";
import PlasmicIcon__HomeHeart from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__HomeHeart";
import type { CareTreatmentItem } from "./centerProfileFields";

type IconComponent = React.ComponentType<React.ComponentProps<"svg">>;

const ICON_RULES: { keywords: string[]; Icon: IconComponent }[] = [
  {
    keywords: ["پزشک", "doctor", "ویزیت", "پزش"],
    Icon: PlasmicIcon__Stethoscope
  },
  {
    keywords: ["پرستار", "nurse", "مراقبت"],
    Icon: PlasmicIcon__Nurse
  },
  {
    keywords: ["فیزیو", "physio", "توانبخشی"],
    Icon: PlasmicIcon__Physotherapist
  },
  {
    keywords: ["ماساژ", "massage"],
    Icon: PlasmicIcon__Massage
  },
  {
    keywords: ["اتاق", "room", "تک", "دو", "سه تخته", "bed"],
    Icon: PlasmicIcon__Bed
  },
  {
    keywords: ["فضای سبز", "باغ", "green", "tree", "پark"],
    Icon: PlasmicIcon__Trees
  },
  {
    keywords: ["کتابخانه", "library", "book"],
    Icon: PlasmicIcon__Books
  },
  {
    keywords: ["تفریح", "recreation", "سرگرمی", "activity"],
    Icon: PlasmicIcon__Activity
  },
  {
    keywords: ["قلب", "cardio", "heart"],
    Icon: PlasmicIcon__Heart
  },
  {
    keywords: ["بیمارستان", "hospital", "کلینیک", "clinic"],
    Icon: PlasmicIcon__BuildingHospital
  }
];

const KEY_INFO_ICON_RULES: { keywords: string[]; Icon: IconComponent }[] = [
  {
    keywords: ["ظرفیت", "خالی", "نفر", "capacity"],
    Icon: PlasmicIcon__UsersGroup
  },
  {
    keywords: ["نیروی فعال", "active_staff"],
    Icon: PlasmicIcon__UsersGroup
  },
  {
    keywords: ["سابقه کاری", "تجربه", "experience"],
    Icon: PlasmicIcon__ClipboardList
  },
  {
    keywords: ["مناطق اعزام", "منطقه", "تهران", "district"],
    Icon: PlasmicIcon__MapPin
  },
  {
    keywords: ["زمان اعزام", "اعزام فوری", "dispatch"],
    Icon: PlasmicIcon__Clock
  },
  {
    keywords: ["روزهای فعالیت", "activity_days"],
    Icon: PlasmicIcon__Calendar
  },
  {
    keywords: ["ساعات پاسخ", "پاسخ‌گویی", "response"],
    Icon: PlasmicIcon__Clock
  },
  {
    keywords: ["هزینه", "ماهانه", "تومان", "قیمت", "price", "cost", "ریال"],
    Icon: PlasmicIcon__CurrencyIranianRial
  },
  {
    keywords: ["نوع پذیرش", "پذیرش", "admission"],
    Icon: PlasmicIcon__ClipboardList
  },
  {
    keywords: ["نوع مرکز", "مرکز", "center type"],
    Icon: PlasmicIcon__BuildingCommunity
  },
  {
    keywords: ["سال تأسیس", "سال تاسیس", "تأسیس", "تاسیس", "founded"],
    Icon: PlasmicIcon__Calendar
  },
  {
    keywords: ["کادر مراقبتی", "کادر", "staff"],
    Icon: PlasmicIcon__UsersGroup
  },
  {
    keywords: ["پرستار شبانه", "شبانه‌روزی", "شبانه روزی", "nurse_24"],
    Icon: PlasmicIcon__Moon
  },
  {
    keywords: ["بیمارستان", "نزدیکی", "فاصله", "hospital"],
    Icon: PlasmicIcon__MapPin
  },
  {
    keywords: ["نوع پزشک", "پزشک"],
    Icon: PlasmicIcon__Stethoscope
  },
  {
    keywords: ["نوع مراقب", "مراقب یا پرستار", "مراقب"],
    Icon: PlasmicIcon__Nurse
  },
  {
    keywords: ["نوع نیروی قابل اعزام", "نیروی قابل اعزام", "اعزام"],
    Icon: PlasmicIcon__Nurse
  },
  {
    keywords: ["نوع مجوز", "مجوز مرکز", "پروانه کسب"],
    Icon: PlasmicIcon__BuildingHospital
  },
  {
    keywords: ["نوع اتاق", "اتاق"],
    Icon: PlasmicIcon__Bed
  },
  {
    keywords: ["مناسب", "suitable"],
    Icon: PlasmicIcon__UserHeart
  },
  {
    keywords: ["امتیاز", "rating", "star"],
    Icon: PlasmicIcon__Star
  },
  {
    keywords: ["نظر", "review", "comment"],
    Icon: PlasmicIcon__Message
  },
  {
    keywords: ["خدمت", "service"],
    Icon: PlasmicIcon__Activity
  },
  {
    keywords: ["تلفن", "phone", "call"],
    Icon: PlasmicIcon__Phone
  },
  {
    keywords: ["ساعات کاری", "ساعات", "business hours", "working hours", "ساعت کاری"],
    Icon: PlasmicIcon__Clock
  },
  {
    keywords: ["door", "ورود", "خانه"],
    Icon: PlasmicIcon__Home
  }
];

const CARE_ICON_BY_ID: Record<string, IconComponent> = {
  caregiver_aide_24h: PlasmicIcon__Nurse,
  private_caregiver: PlasmicIcon__UserHeart,
  dedicated_caregiver: PlasmicIcon__UserHeart,
  nutritionist: PlasmicIcon__Apple,
  hospital_collab: PlasmicIcon__BuildingHospital,
  hospital_cooperation: PlasmicIcon__BuildingHospital,
  psychologist: PlasmicIcon__Brain,
  psychiatrist: PlasmicIcon__MoodSmile,
  geriatrician: PlasmicIcon__Old,
  physiotherapist: PlasmicIcon__Physotherapist,
  occupational_therapist: PlasmicIcon__Walk,
  social_worker: PlasmicIcon__UsersGroup,
  dentist: PlasmicIcon__Dental,
  speech_therapist: PlasmicIcon__Speakerphone,
  medication_management: PlasmicIcon__Pill,
  medication_manager: PlasmicIcon__Pill,
  doctor: PlasmicIcon__Stethoscope
};

const CARE_ICON_RULES: { keywords: string[]; Icon: IconComponent }[] = [
  { keywords: ["کمک‌بهیار", "مراقب", "پرستار"], Icon: PlasmicIcon__Nurse },
  { keywords: ["تغذیه"], Icon: PlasmicIcon__Apple },
  { keywords: ["بیمارستان"], Icon: PlasmicIcon__BuildingHospital },
  { keywords: ["روانشناس"], Icon: PlasmicIcon__Brain },
  { keywords: ["روانپزشک"], Icon: PlasmicIcon__MoodSmile },
  { keywords: ["سالمندی"], Icon: PlasmicIcon__Old },
  { keywords: ["فیزیو"], Icon: PlasmicIcon__Physotherapist },
  { keywords: ["کاردرمان"], Icon: PlasmicIcon__Walk },
  { keywords: ["مددکار"], Icon: PlasmicIcon__UsersGroup },
  { keywords: ["دندان"], Icon: PlasmicIcon__Dental },
  { keywords: ["گفتار"], Icon: PlasmicIcon__Speakerphone },
  { keywords: ["دارو"], Icon: PlasmicIcon__Pill },
  { keywords: ["پزشک"], Icon: PlasmicIcon__Stethoscope },
  { keywords: ["کمک اولیه", "درمان"], Icon: PlasmicIcon__FirstAidKit },
  { keywords: ["قلب"], Icon: PlasmicIcon__Heartbeat }
];

const FALLBACK_ICONS: IconComponent[] = [
  PlasmicIcon__CircleCheck,
  PlasmicIcon__Activity,
  PlasmicIcon__Heart,
  PlasmicIcon__Books
];

function normalizeLabel(value?: string) {
  return (value || "").toLowerCase().trim();
}

export function getServiceIcon(
  service: { name?: string; description?: string },
  index = 0
): IconComponent {
  const haystack = normalizeLabel(
    `${service.name || ""} ${service.description || ""}`
  );
  const match = ICON_RULES.find(rule =>
    rule.keywords.some(keyword => haystack.includes(keyword.toLowerCase()))
  );
  if (match) return match.Icon;
  return FALLBACK_ICONS[index % FALLBACK_ICONS.length];
}

export function getKeyInfoIcon(
  item: { label?: string; value?: string },
  index = 0
): IconComponent {
  const haystack = normalizeLabel(`${item.label || ""} ${item.value || ""}`);
  const match = KEY_INFO_ICON_RULES.find(rule =>
    rule.keywords.some(keyword => haystack.includes(keyword.toLowerCase()))
  );
  if (match) return match.Icon;
  const serviceMatch = ICON_RULES.find(rule =>
    rule.keywords.some(keyword => haystack.includes(keyword.toLowerCase()))
  );
  if (serviceMatch) return serviceMatch.Icon;
  return FALLBACK_ICONS[index % FALLBACK_ICONS.length];
}

export function getCareTreatmentIcon(
  item: Pick<CareTreatmentItem, "id" | "label" | "detail">,
  index = 0
): IconComponent {
  if (item.id && CARE_ICON_BY_ID[item.id]) return CARE_ICON_BY_ID[item.id];
  const haystack = normalizeLabel(`${item.label || ""} ${item.detail || ""}`);
  const match = CARE_ICON_RULES.find(rule =>
    rule.keywords.some(keyword => haystack.includes(keyword.toLowerCase()))
  );
  if (match) return match.Icon;
  return FALLBACK_ICONS[index % FALLBACK_ICONS.length];
}

const DAILY_LIFE_ICON_BY_ID: Record<string, IconComponent> = {
  daily_schedule: PlasmicIcon__CalendarEvent,
  wake_time: PlasmicIcon__CalendarEvent,
  sleep_time: PlasmicIcon__CalendarEvent,
  daily_routine_desc: PlasmicIcon__CalendarEvent,
  weekly_schedule_sample: PlasmicIcon__CalendarEvent,
  allows_family_participation: PlasmicIcon__Friends,
  has_special_needs_program: PlasmicIcon__HeartHandshake,
  light_exercise: PlasmicIcon__Stretching,
  social_programs: PlasmicIcon__Friends,
  creative_workshops: PlasmicIcon__Palette
};

const FAMILY_VISIT_ICON_BY_ID: Record<string, IconComponent> = {
  in_person_visit: PlasmicIcon__HomeHeart,
  video_call: PlasmicIcon__Video,
  phone_contact: PlasmicIcon__Video,
  communication_terms: PlasmicIcon__HeartHandshake,
  needs_prior_coordination: PlasmicIcon__HeartHandshake,
  allows_private_visit: PlasmicIcon__HomeHeart,
  allows_open_space_visit: PlasmicIcon__HomeHeart,
  max_visitors_count: PlasmicIcon__Friends,
  allows_temporary_leave: PlasmicIcon__HomeHeart,
  allows_overnight_leave: PlasmicIcon__HomeHeart,
  status_report: PlasmicIcon__HeartHandshake,
  contact_person_role: PlasmicIcon__HeartHandshake,
  allows_direct_staff_contact: PlasmicIcon__HeartHandshake,
  complaint: PlasmicIcon__HeartHandshake
};

export function getDailyLifeIcon(id?: string, index = 0): IconComponent {
  if (id && DAILY_LIFE_ICON_BY_ID[id]) return DAILY_LIFE_ICON_BY_ID[id];
  return FALLBACK_ICONS[index % FALLBACK_ICONS.length];
}

export function getFamilyVisitIcon(id?: string, index = 0): IconComponent {
  if (id && FAMILY_VISIT_ICON_BY_ID[id]) return FAMILY_VISIT_ICON_BY_ID[id];
  return FALLBACK_ICONS[index % FALLBACK_ICONS.length];
}
