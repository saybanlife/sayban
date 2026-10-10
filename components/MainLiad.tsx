import * as React from "react";
import {
  PlasmicMainLiad,
  DefaultMainLiadProps
} from "./plasmic/sayban/PlasmicMainLiad";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { readCookie } from "@/lib/authCookies";
import {
  PUBLIC_AUTH_COOKIE_NAME,
  resolvePublicAuthToken
} from "@/lib/publicAuthToken";

export interface MainLiadProps extends DefaultMainLiadProps {}

function MainLiad_(props: MainLiadProps, ref: HTMLElementRefOf<"div">) {
  // Same source as Homepage `$state.token`: cookie `token` via resolvePublicAuthToken.
  const token =
    resolvePublicAuthToken(props.token) ||
    resolvePublicAuthToken(readCookie(PUBLIC_AUTH_COOKIE_NAME));

  return <PlasmicMainLiad root={{ ref }} {...props} token={token || undefined} />;
}

const MainLiad = React.forwardRef(MainLiad_);
export default MainLiad;
