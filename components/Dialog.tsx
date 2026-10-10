import * as React from "react";
import {
  PlasmicDialog,
  DefaultDialogProps,
  type PlasmicDialog__OverridesType
} from "./plasmic/sayban/PlasmicDialog";
import type { ModalHashProps } from "@/lib/modalHash";
import { useOpendialogModalHash } from "@/lib/useModalHash";
import { retainOpenDialog, isInNestedDismissGrace, type OpenDialogHandle } from "@/lib/dialogNesting";

export interface DialogProps extends DefaultDialogProps, ModalHashProps {
  /**
   * Prevent Radix from autofocusing the first focusable (often an input)
   * when the dialog opens. Stops the mobile keyboard from covering the sheet.
   */
  disableOpenAutoFocus?: boolean;
  overrides?: PlasmicDialog__OverridesType;
}

function Dialog(props: DialogProps) {
  const {
    modalHashId,
    disableModalHash,
    disableOpenAutoFocus,
    opendialog,
    onOpendialogChange,
    overrides,
    ...rest
  } = props;

  const nestRef = React.useRef<OpenDialogHandle | null>(null);

  React.useEffect(() => {
    if (!opendialog) {
      nestRef.current = null;
      return;
    }
    const handle = retainOpenDialog();
    nestRef.current = handle;
    return () => {
      handle.release();
      if (nestRef.current === handle) nestRef.current = null;
    };
  }, [opendialog]);

  const handleOpenChange = React.useCallback(
    (val: boolean | string) => {
      const next = typeof val === "boolean" ? val : Boolean(val);
      // Buried under a nested dialog, or parent receiving the child's teardown
      // as outside-dismiss: keep the stack intact.
      if (
        !next &&
        opendialog &&
        nestRef.current &&
        (!nestRef.current.isTopmost() || isInNestedDismissGrace())
      ) {
        return;
      }
      onOpendialogChange?.(val as never);
    },
    [onOpendialogChange, opendialog]
  );

  useOpendialogModalHash(opendialog, handleOpenChange, {
    modalHashId,
    disableModalHash
  });

  const mergedOverrides = React.useMemo(() => {
    if (!disableOpenAutoFocus) return overrides;
    const prev = overrides?.dialogContent;
    const prevRecord =
      prev && typeof prev === "object" ? (prev as Record<string, unknown>) : {};
    const prevProps =
      prevRecord.props && typeof prevRecord.props === "object"
        ? (prevRecord.props as Record<string, unknown>)
        : {};
    const prevOnOpenAutoFocus = prevProps.onOpenAutoFocus as
      | ((event: Event) => void)
      | undefined;
    return {
      ...overrides,
      dialogContent: {
        ...prevRecord,
        props: {
          ...prevProps,
          onOpenAutoFocus: (event: Event) => {
            event.preventDefault();
            prevOnOpenAutoFocus?.(event);
          }
        }
      }
    } as PlasmicDialog__OverridesType;
  }, [disableOpenAutoFocus, overrides]);

  return (
    <PlasmicDialog
      opendialog={opendialog}
      onOpendialogChange={handleOpenChange}
      overrides={mergedOverrides}
      {...rest}
    />
  );
}

export default Dialog;
