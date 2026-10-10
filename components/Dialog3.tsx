import * as React from "react";
import {
  PlasmicDialog3,
  DefaultDialog3Props
} from "./plasmic/sayban/PlasmicDialog3";
import type { ModalHashProps } from "@/lib/modalHash";
import { useOpendialogModalHash } from "@/lib/useModalHash";
import { retainOpenDialog, isInNestedDismissGrace, type OpenDialogHandle } from "@/lib/dialogNesting";

export interface Dialog3Props extends DefaultDialog3Props, ModalHashProps {}

function Dialog3(props: Dialog3Props) {
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
    <PlasmicDialog3
      opendialog={opendialog}
      onOpendialogChange={handleOpenChange}
      {...rest}
    />
  );
}

export default Dialog3;
