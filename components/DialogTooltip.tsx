import * as React from "react";
import {
  PlasmicDialogTooltip,
  DefaultDialogTooltipProps
} from "./plasmic/sayban/PlasmicDialogTooltip";
import type { ModalHashProps } from "@/lib/modalHash";
import { useOpendialogModalHash } from "@/lib/useModalHash";
import { retainOpenDialog, isInNestedDismissGrace, type OpenDialogHandle } from "@/lib/dialogNesting";

export interface DialogTooltipProps
  extends DefaultDialogTooltipProps,
    ModalHashProps {}

function DialogTooltip(props: DialogTooltipProps) {
  const { modalHashId, disableModalHash, opendialog, onOpendialogChange, ...rest } =
    props;

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

  return (
    <PlasmicDialogTooltip
      opendialog={opendialog}
      onOpendialogChange={handleOpenChange}
      {...rest}
    />
  );
}

export default DialogTooltip;
