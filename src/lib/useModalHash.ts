import * as React from "react";
import {
  buildModalHash,
  getCurrentPathWithSearch,
  parseModalHash,
  type ModalHashProps
} from "./modalHash";

export type UseModalHashOptions = ModalHashProps;

/**
 * Shared across every mounted modal, because one modal closing itself calls
 * `history.back()`, which fires `popstate` on *all* of them. With a per-instance
 * flag the other open modals treated that pop as their own and closed too, so a
 * nested dialog took its parent down with it.
 *
 * Keep the counter up long enough for the async `popstate` that follows
 * `history.back()` — a bare `setTimeout(0)` often expired first.
 */
let historyBackInFlight = 0;

/** Replaces the current entry without the modal hash — no navigation. */
function stripModalHash() {
  window.history.replaceState(
    { ...window.history.state },
    "",
    getCurrentPathWithSearch()
  );
}

function beginHistoryBack() {
  historyBackInFlight += 1;
  window.history.back();
  window.setTimeout(() => {
    historyBackInFlight = Math.max(0, historyBackInFlight - 1);
  }, 50);
}

/**
 * Syncs modal open state with URL hash (#modal-{id}).
 * - Opening pushes a history entry with the modal hash.
 * - Browser Back removes the hash and closes the modal.
 * - Programmatic close calls history.back() when this modal owns the hash.
 * - A nested modal pushing another `#modal-*` must NOT close its parent.
 */
export function useModalHash(
  isOpen: boolean,
  onOpenChange: ((open: boolean) => void) | undefined,
  options: UseModalHashOptions = {}
) {
  const autoId = React.useId().replace(/:/g, "");
  const modalId = options.modalHashId ?? autoId;
  const enabled = options.disableModalHash !== true;
  const hash = buildModalHash(modalId);

  const isOpenRef = React.useRef(isOpen);
  const ownsHashRef = React.useRef(false);

  isOpenRef.current = isOpen;

  const onOpenChangeRef = React.useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  React.useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    if (isOpen && window.location.hash !== hash) {
      // Spread the existing state so Next's own `idx`/`__N` keys survive.
      // Replacing it wholesale left the router unable to route this entry and
      // broke `canGoBackWithinApp()`, which reads `history.state.idx`.
      window.history.pushState(
        { ...window.history.state, modalHashId: modalId },
        "",
        `${getCurrentPathWithSearch()}${hash}`
      );
      ownsHashRef.current = true;
    }
  }, [enabled, hash, isOpen, modalId]);

  React.useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const syncFromHistory = () => {
      if (historyBackInFlight > 0) return;

      const hasOwnHash = window.location.hash === hash;
      if (hasOwnHash) {
        ownsHashRef.current = true;
        return;
      }

      if (!isOpenRef.current) {
        ownsHashRef.current = false;
        return;
      }

      // Nested picker/dialog pushed another `#modal-*` on top of us. Stay open;
      // only the topmost entry should dismiss on Back.
      if (parseModalHash(window.location.hash)) {
        return;
      }

      // No modal hash left — Back (or an external navigation) left this dialog.
      ownsHashRef.current = false;
      onOpenChangeRef.current?.(false);
    };

    window.addEventListener("popstate", syncFromHistory);
    window.addEventListener("hashchange", syncFromHistory);
    return () => {
      window.removeEventListener("popstate", syncFromHistory);
      window.removeEventListener("hashchange", syncFromHistory);
    };
  }, [enabled, hash]);

  React.useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    if (!isOpen && window.location.hash === hash) {
      if (ownsHashRef.current) {
        beginHistoryBack();
      } else {
        // The hash was already on the URL when we mounted (a deep link), so we
        // never pushed an entry. Going back would leave the page entirely;
        // drop the hash in place instead.
        stripModalHash();
      }
    }

    // Only on close — the open effect above sets ownership and runs first.
    if (!isOpen) {
      ownsHashRef.current = false;
    }
  }, [enabled, hash, isOpen]);
}

type OpenDialogChangeHandler =
  | ((value: boolean) => void)
  | ((value: string) => void);

export function useOpendialogModalHash(
  opendialog: boolean | undefined,
  onOpendialogChange: OpenDialogChangeHandler | undefined,
  options: UseModalHashOptions = {}
) {
  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      onOpendialogChange?.(open as never);
    },
    [onOpendialogChange]
  );

  useModalHash(Boolean(opendialog), handleOpenChange, options);
}

export function useIsOpenModalHash(
  isOpen: boolean | undefined,
  onOpenChange: ((open: boolean) => void) | undefined,
  options: UseModalHashOptions = {}
) {
  useModalHash(Boolean(isOpen), onOpenChange, options);
}
