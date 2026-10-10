import * as React from "react";
import { Toaster } from "react-hot-toast";
import { useRouter } from "next/router";
import { resolveToastPosition } from "./toastUtils";

export function SaybanToaster() {
  const router = useRouter();
  const position = resolveToastPosition(router.pathname);

  return (
    <Toaster
      position={position}
      gutter={12}
      containerClassName="sayban-toaster"
      containerStyle={{
        zIndex: 99999
      }}
      toastOptions={{
        duration: 4000
      }}
    />
  );
}
