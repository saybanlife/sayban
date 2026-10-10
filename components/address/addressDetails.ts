export function splitAddressDetails(value: unknown) {
  const details = String(value ?? "").trim();
  if (!details) return { plaque: "", unit: "" };
  const plaque = details.match(/(?:پلاک)\s*[:：]?\s*([^،,]+)/)?.[1]?.trim();
  const unit = details.match(/(?:واحد)\s*[:：]?\s*([^،,]+)/)?.[1]?.trim();
  if (plaque || unit) return { plaque: plaque ?? "", unit: unit ?? "" };
  return { plaque: details, unit: "" };
}

export function joinAddressDetails(plaque: unknown, unit: unknown) {
  const parts = [
    String(plaque ?? "").trim() ? `پلاک ${String(plaque).trim()}` : "",
    String(unit ?? "").trim() ? `واحد ${String(unit).trim()}` : ""
  ].filter(Boolean);
  return parts.join("، ");
}
