import styles from "./CenterPanelPageChrome.module.css";

const OPEN_ATTR = "data-sayban-open";
const READY_ATTR = "data-sayban-collapsible";
const ADOPTED_ATTR = "data-sayban-adopted";

type EnhanceOptions = {
  /** Cards to leave untouched (already hidden or replaced). */
  skipClasses?: string[];
  /**
   * Resolves the header row of a card. Some Plasmic cards nest the title one
   * level below the card root. Defaults to the card's first element child.
   */
  headerFor?: (card: HTMLElement) => HTMLElement | null;
};

/**
 * Everything that visually belongs to the card body: the siblings following the
 * header, walking up to the card root so nested headers still collapse the
 * trailing content (e.g. a footer button next to the header's wrapper).
 */
function collectBody(card: HTMLElement, header: HTMLElement): HTMLElement[] {
  const body: HTMLElement[] = [];
  let node: HTMLElement | null = header;
  while (node && node !== card) {
    let sibling = node.nextElementSibling;
    while (sibling) {
      if (sibling instanceof HTMLElement) body.push(sibling);
      sibling = sibling.nextElementSibling;
    }
    node = node.parentElement;
  }
  return body;
}

/**
 * Turn a Plasmic-rendered white card into a collapsible one.
 *
 * Plasmic owns this DOM, so rather than restructuring it we prepend a toggle to
 * the card's header row and hide the body elements directly. Each card keeps
 * its own state, and the pass is idempotent so it can be re-run from a
 * MutationObserver after Plasmic re-renders.
 */
function makeCollapsible(card: HTMLElement, header: HTMLElement) {
  if (card.hasAttribute(READY_ATTR)) return;

  const body = collectBody(card, header);
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = styles.legacyToggle;
  const label = (header.textContent || "").trim();
  toggle.setAttribute(
    "aria-label",
    label ? `باز و بستن ${label}` : "باز و بستن"
  );

  const apply = (open: boolean) => {
    card.setAttribute(OPEN_ATTR, open ? "true" : "false");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.textContent = open ? "▾" : "◂";
    for (const el of body) el.style.display = open ? "" : "none";
  };

  toggle.addEventListener("click", () => {
    apply(card.getAttribute(OPEN_ATTR) === "false");
  });

  card.setAttribute(READY_ATTR, "true");
  apply(true);
  header.prepend(toggle);
}

/** Make every white card directly inside `column` collapsible. */
export function enhanceLegacyPanelCards(
  column: HTMLElement,
  { skipClasses = [], headerFor }: EnhanceOptions = {}
) {
  for (const child of Array.from(column.children)) {
    if (!(child instanceof HTMLElement)) continue;
    if (child.dataset.saybanWorkspace === "true") continue;
    // Cards moved into the workspace get their host card's toggle instead.
    if (child.hasAttribute(ADOPTED_ATTR)) continue;
    if (skipClasses.some(cls => cls && child.classList.contains(cls))) continue;

    const header = headerFor?.(child) ?? child.firstElementChild;
    if (header instanceof HTMLElement) makeCollapsible(child, header);
  }
}

/**
 * Move the legacy center-details card into the workspace's «اطلاعات مرکز» slot
 * so all center information lives in a single main card.
 *
 * Re-runnable: if Plasmic re-renders and re-attaches the card to its original
 * column, the next pass moves it back.
 */
export function adoptLegacyCenterInfo(card: HTMLElement, slot: HTMLElement) {
  if (card.parentElement === slot) return;
  card.setAttribute(ADOPTED_ATTR, "true");
  slot.appendChild(card);
}

export default enhanceLegacyPanelCards;
