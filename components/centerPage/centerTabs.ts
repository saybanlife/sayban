export const CENTER_TAB_SECTIONS = [
  { label: "درباره مرکز", value: "center-summary" },
  // TEMP hidden: services section UI — re-enable with CenterServicesSection flag
  // { label: "خدمات", value: "center-services" },
  { label: "ساعات کاری", value: "center-care" }
] as const;

export const CENTER_FAQ_TAB = {
  label: "سوالات متداول",
  value: "center-faq"
} as const;

export const CENTER_DAILY_LIFE_TAB = {
  label: "برنامه روزانه و فعالیت‌ها",
  value: "center-daily-life"
} as const;

export const CENTER_AMENITIES_TAB = {
  label: "امکانات",
  value: "center-amenities"
} as const;

/** Sticky header (~4.5rem) + Topics tab bar (~50px). */
export const CENTER_SCROLL_OFFSET_PX = 130;

export function scrollToCenterSection(
  sectionId: string,
  options?: { container?: HTMLElement | null; offset?: number }
) {
  if (!sectionId) return;
  const el = document.getElementById(sectionId);
  if (!el) return;

  const offset = options?.offset ?? CENTER_SCROLL_OFFSET_PX;
  const container = options?.container;

  // Center page scrolls inside PlasmicCenter root (100vh + overflow:auto),
  // not the window — prefer that container when provided.
  if (container) {
    const containerTop = container.getBoundingClientRect().top;
    const elTop = el.getBoundingClientRect().top;
    const top = container.scrollTop + (elTop - containerTop) - offset;
    container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    return;
  }

  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}
