export type CenterStaffCard = {
  id: number;
  name: string;
  avatar: string;
  rating: number;
  experience_years: number;
  gender: string;
  type: string;
};

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

function readString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

export function formatStaffRating(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return (Math.round(value * 10) / 10).toFixed(1);
}

export function formatStaffExperience(years: number): string {
  if (!Number.isFinite(years) || years <= 0) return "سابقه ثبت نشده";
  return `${years} سال سابقه`;
}

export function staffTypeLabel(type: string, gender: string): string {
  const t = type.trim().toLowerCase();
  const g = gender.trim().toLowerCase();
  const role =
    t === "specialized" || t === "متخصص" ? "پرستار متخصص" : "پرستار";
  if (g === "female" || g === "زن" || g === "خانم") return `${role} خانم`;
  if (g === "male" || g === "مرد" || g === "آقا") return `${role} آقا`;
  return role;
}

export function normalizeCenterStaff(
  raw: unknown,
  limit = 8
): CenterStaffCard[] {
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(asObject(raw).staff)
      ? (asObject(raw).staff as unknown[])
      : Array.isArray(asObject(raw).staffs)
        ? (asObject(raw).staffs as unknown[])
        : [];

  const mapped = list
    .map(item => {
      const row = asObject(item);
      const id = Number(row.id);
      const name = readString(row.name);
      if (!Number.isFinite(id) || id <= 0 || !name) return null;
      return {
        id,
        name,
        avatar: readString(row.avatar ?? row.main_image ?? row.image),
        rating: Number(row.rating || 0) || 0,
        experience_years: Number(row.experience_years || 0) || 0,
        gender: readString(row.gender),
        type: readString(row.type)
      } satisfies CenterStaffCard;
    })
    .filter((item): item is CenterStaffCard => Boolean(item));

  return mapped.slice(0, limit);
}
