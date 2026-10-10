import * as React from "react";
import { getLastCenterProfileUploadUrl } from "../ImageProfile";

/**
 * After Plasmic saves center profile image, refresh visible avatar URLs
 * (Plasmic does not refetch centerData.main_image on success).
 */
export function refreshCenterProfileImagesIn(root: HTMLElement | null) {
  const url = getLastCenterProfileUploadUrl();
  if (!url || !root) return url;
  root.querySelectorAll<HTMLImageElement>("img").forEach(img => {
    const dw = (img.getAttribute("displaywidth") || "").toLowerCase();
    const dh = (img.getAttribute("displayheight") || "").toLowerCase();
    const isHeaderAvatar = dw === "50px" || dh === "50px";
    if (isHeaderAvatar) img.src = url;
  });
  return url;
}

export function useProfileImageSaveOverride(
  rootRef: React.RefObject<HTMLElement | null>,
  onSaved?: () => void
) {
  return React.useMemo(
    () => ({
      saveUpload2: {
        render: (ps: any, Comp: React.ComponentType<any>) => {
          const { onClick, ...rest } = ps ?? {};
          return (
            <Comp
              {...rest}
              onClick={async (event: any) => {
                await onClick?.(event);
                window.setTimeout(() => {
                  refreshCenterProfileImagesIn(rootRef.current);
                  onSaved?.();
                }, 400);
              }}
            />
          );
        }
      }
    }),
    [onSaved, rootRef]
  );
}
