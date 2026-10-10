import * as React from "react";
import {
  PlasmicPanelMenuItem,
  DefaultPanelMenuItemProps
} from "./plasmic/sayban/PlasmicPanelMenuItem";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { withPanelMenuIcon } from "./panel/panelMenuIcons";

export interface PanelMenuItemProps extends DefaultPanelMenuItemProps {}

/**
 * Leaf menu rows often omit `children`. Plasmic's click handler used to read
 * `item.children.length` and throw. Always pass an array so expand/navigate
 * stays safe.
 */
function withSafeChildren(item: PanelMenuItemProps["item"]) {
  if (!item || typeof item !== "object") return item;
  const record = item as Record<string, unknown>;
  if (Array.isArray(record.children)) return item;
  return { ...record, children: [] };
}

function PanelMenuItem_(
  props: PanelMenuItemProps,
  ref: HTMLElementRefOf<"div">
) {
  const { item, ...rest } = props;
  const safeItem = React.useMemo(
    () => withPanelMenuIcon(withSafeChildren(item)),
    [item]
  );

  return <PlasmicPanelMenuItem root={{ ref }} {...rest} item={safeItem} />;
}

const PanelMenuItem = React.forwardRef(PanelMenuItem_);
export default PanelMenuItem;
