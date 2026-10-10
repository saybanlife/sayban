import type { ToastPosition } from "react-hot-toast";

export type SaybanToastType = "success" | "error" | "info" | "warning";

export function resolveToastPosition(pathname?: string): ToastPosition {
  const path = pathname ?? "";
  if (path.startsWith("/panel")) {
    return "top-right";
  }
  return "bottom-center";
}

export function normalizeToastType(type: string): SaybanToastType {
  if (type === "success" || type === "error" || type === "info" || type === "warning") {
    return type;
  }
  return "info";
}
