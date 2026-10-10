import * as React from "react";
import {
  PlasmicDrawer,
  DefaultDrawerProps
} from "./plasmic/sayban/PlasmicDrawer";
import type { ModalHashProps } from "@/lib/modalHash";
import { useIsOpenModalHash } from "@/lib/useModalHash";

export interface DrawerProps extends DefaultDrawerProps, ModalHashProps {}

function Drawer(props: DrawerProps) {
  const { modalHashId, disableModalHash, isOpen, onOpenChange, ...rest } = props;

  useIsOpenModalHash(isOpen, onOpenChange, {
    modalHashId,
    disableModalHash
  });

  return (
    <PlasmicDrawer isOpen={isOpen} onOpenChange={onOpenChange} {...rest} />
  );
}

export default Drawer;
