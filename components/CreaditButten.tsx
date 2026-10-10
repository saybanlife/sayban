import * as React from "react";
import {
  PlasmicCreaditButten,
  DefaultCreaditButtenProps
} from "./plasmic/sayban/PlasmicCreaditButten";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { readCookie } from "@/lib/authCookies";
import {
  PUBLIC_AUTH_COOKIE_NAME,
  resolvePublicAuthToken
} from "@/lib/publicAuthToken";

export interface CreaditButtenProps extends DefaultCreaditButtenProps {}

function CreaditButten_(
  props: CreaditButtenProps,
  ref: HTMLElementRefOf<"div">
) {
  const token =
    resolvePublicAuthToken(props.token) ||
    resolvePublicAuthToken(readCookie(PUBLIC_AUTH_COOKIE_NAME));

  return (
    <PlasmicCreaditButten root={{ ref }} {...props} token={token || undefined} />
  );
}

const CreaditButten = React.forwardRef(CreaditButten_);
export default CreaditButten;
