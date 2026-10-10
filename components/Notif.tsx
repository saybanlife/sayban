import * as React from "react";
import { PlasmicNotif, DefaultNotifProps } from "./plasmic/sayban/PlasmicNotif";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { SAYBAN_APP_SHORT_NAME, SAYBAN_LOGO_SRC } from "@/lib/brandAssets";
import styles from "./Notif.module.css";

export interface NotifProps extends DefaultNotifProps {}

function NotifLogo() {
  return (
    <img
      src={SAYBAN_LOGO_SRC}
      alt={SAYBAN_APP_SHORT_NAME}
      className={styles.logoItem}
      loading="lazy"
      decoding="async"
    />
  );
}

function Notif_(props: NotifProps, ref: HTMLElementRefOf<"div">) {
  return (
    <PlasmicNotif
      root={{ ref }}
      {...props}
      notifBox={{
        render: (renderProps: any, DefaultNotifBox: any) => (
          <DefaultNotifBox {...renderProps} slot={<NotifLogo />} />
        )
      }}
    />
  );
}

const Notif = React.forwardRef(Notif_);
export default Notif;
