import * as React from "react";
import {
  PlasmicSnackbar,
  DefaultSnackbarProps
} from "./plasmic/sayban/PlasmicSnackbar";
import type { ModalHashProps } from "@/lib/modalHash";
import { useOpendialogModalHash } from "@/lib/useModalHash";

export interface SnackbarProps extends DefaultSnackbarProps, ModalHashProps {}

function Snackbar(props: SnackbarProps) {
  const { modalHashId, disableModalHash, opendialog, onOpendialogChange, ...rest } =
    props;

  // A snackbar is transient feedback, not a screen: giving it a history entry
  // meant Back dismissed a toast instead of navigating. Opt out unless a caller
  // explicitly asks for hash syncing.
  useOpendialogModalHash(opendialog, onOpendialogChange, {
    modalHashId,
    disableModalHash: disableModalHash ?? !modalHashId
  });

  return (
    <PlasmicSnackbar
      opendialog={opendialog}
      onOpendialogChange={onOpendialogChange}
      {...rest}
    />
  );
}

export default Snackbar;
