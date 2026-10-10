export const MODAL_HASH_PREFIX = "modal-";

export function buildModalHash(modalId: string): string {
  return `#${MODAL_HASH_PREFIX}${modalId}`;
}

export function parseModalHash(hash: string): string | null {
  const prefix = `#${MODAL_HASH_PREFIX}`;
  if (!hash.startsWith(prefix)) return null;
  const id = hash.slice(prefix.length);
  return id.length > 0 ? id : null;
}

export function getCurrentPathWithSearch(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}`;
}

export type ModalHashProps = {
  /** Stable id used in the URL hash (#modal-{id}). Auto-generated when omitted. */
  modalHashId?: string;
  /** Disable hash sync for dialogs that should not affect browser history. */
  disableModalHash?: boolean;
};
