import * as React from "react";
import {
  PlasmicModal,
  DefaultModalProps,
  type PlasmicModal__OverridesType
} from "./plasmic/sayban/PlasmicModal";
import type { ModalHashProps } from "@/lib/modalHash";
import { useIsOpenModalHash } from "@/lib/useModalHash";
import {
  getOpenDialogCount,
  isInNestedDismissGrace,
  retainOpenDialog,
  type OpenDialogHandle
} from "@/lib/dialogNesting";
import styles from "./Modal.module.css";

export interface ModalProps extends DefaultModalProps, ModalHashProps {
  overrides?: PlasmicModal__OverridesType;
}

function withClass(
  override: { className?: string; props?: Record<string, unknown> } | null | undefined,
  extra: string
) {
  const base = override ?? undefined;
  return {
    ...base,
    className: [extra, base?.className].filter(Boolean).join(" ")
  };
}

/** Native <select> / option clicks must not count as "outside" the modal. */
function shouldKeepModalOpenForTarget(element: Element): boolean {
  const tag = element.tagName;
  if (tag === "SELECT" || tag === "OPTION" || tag === "OPTGROUP") return true;
  if (element.closest("select")) return true;
  // Nested Radix Dialog (e.g. PanelTimePicker) is portaled outside this modal.
  if (
    element.closest(
      "[data-radix-dialog-content], [data-radix-dialog-overlay], [role='dialog']"
    )
  ) {
    return true;
  }
  return false;
}

function Modal(props: ModalProps) {
  const {
    modalHashId,
    disableModalHash,
    isOpen,
    onOpenChange,
    overrides,
    ...rest
  } = props;

  const nestRef = React.useRef<OpenDialogHandle | null>(null);

  React.useEffect(() => {
    if (!isOpen) {
      nestRef.current = null;
      return;
    }
    const handle = retainOpenDialog();
    nestRef.current = handle;
    return () => {
      handle.release();
      if (nestRef.current === handle) nestRef.current = null;
    };
  }, [isOpen]);

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      // Nested picker Dialog is topmost, or parent is catching the child's
      // teardown as outside-dismiss — keep this modal open.
      if (
        !open &&
        isOpen &&
        nestRef.current &&
        (!nestRef.current.isTopmost() || isInNestedDismissGrace())
      ) {
        return;
      }
      onOpenChange?.(open);
    },
    [isOpen, onOpenChange]
  );

  useIsOpenModalHash(isOpen, handleOpenChange, {
    modalHashId,
    disableModalHash
  });

  const ariaDialogOverride =
    overrides?.ariaDialog && typeof overrides.ariaDialog === "object"
      ? (overrides.ariaDialog as {
          className?: string;
          props?: Record<string, unknown>;
        })
      : undefined;
  const scrollableOverride =
    overrides?.scrollableContent &&
    typeof overrides.scrollableContent === "object"
      ? (overrides.scrollableContent as {
          className?: string;
          props?: Record<string, unknown>;
        })
      : undefined;
  const ariaModalOverride =
    overrides?.ariaModal && typeof overrides.ariaModal === "object"
      ? (overrides.ariaModal as {
          className?: string;
          props?: Record<string, unknown>;
        })
      : undefined;

  const prevShouldClose = ariaModalOverride?.props
    ?.shouldCloseOnInteractOutside as
    | ((element: Element) => boolean)
    | undefined;

  return (
    <PlasmicModal
      {...(rest as React.ComponentProps<typeof PlasmicModal>)}
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      overrides={{
        ...overrides,
        ariaModal: {
          ...ariaModalOverride,
          props: {
            ...ariaModalOverride?.props,
            shouldCloseOnInteractOutside: (element: Element) => {
              if (shouldKeepModalOpenForTarget(element)) return false;
              // Another Dialog (time/date picker) is open above this modal.
              if (getOpenDialogCount() > 1) return false;
              if (isInNestedDismissGrace()) return false;
              if (prevShouldClose) return prevShouldClose(element);
              return true;
            }
          }
        },
        ariaDialog: withClass(ariaDialogOverride, styles.dialog),
        scrollableContent: withClass(scrollableOverride, styles.body)
      }}
    />
  );
}

export default Modal;
