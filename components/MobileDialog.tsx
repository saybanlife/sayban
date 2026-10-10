import * as React from "react";
import {
  PlasmicMobileDialog,
  DefaultMobileDialogProps
} from "./plasmic/sayban/PlasmicMobileDialog";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import type { ModalHashProps } from "@/lib/modalHash";
import { useModalHash } from "@/lib/useModalHash";

export interface MobileDialogProps
  extends DefaultMobileDialogProps,
    ModalHashProps {}

function MobileDialog_(
  props: MobileDialogProps,
  ref: HTMLElementRefOf<"div">
) {
  const { modalHashId, disableModalHash, open, onOpenChange, ...rest } = props;

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      onOpenChange?.(nextOpen as never);
    },
    [onOpenChange]
  );

  useModalHash(Boolean(open), handleOpenChange, {
    modalHashId,
    disableModalHash
  });

  return (
    <PlasmicMobileDialog root={{ ref }} open={open} onOpenChange={onOpenChange} {...rest} />
  );
}

const MobileDialog = React.forwardRef(MobileDialog_);
export default MobileDialog;
