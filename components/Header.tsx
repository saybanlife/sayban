import * as React from "react";
import {
  PlasmicHeader,
  DefaultHeaderProps
} from "./plasmic/sayban/PlasmicHeader";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import styles from "./HeaderHitArea.module.css";

export interface HeaderProps extends DefaultHeaderProps {}

function Header_(props: HeaderProps, ref: HTMLElementRefOf<"section">) {
  const { className, ...rest } = props;
  return (
    <PlasmicHeader
      {...rest}
      root={{
        ref,
        className: [styles.root, className].filter(Boolean).join(" ")
      }}
    />
  );
}

const Header = React.forwardRef(Header_);
export default Header;
