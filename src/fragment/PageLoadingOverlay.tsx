import * as React from "react";
import { lockBodyScroll } from "@/lib/bodyScrollLock";
import styles from "./pageLoadingOverlay.module.css";

const DEFAULT_MESSAGE = "در حال بارگذاری...";

export type PageLoadingOverlayProps = {
  /** Defaults to «در حال بارگذاری...». */
  message?: string;
};

/**
 * Blocking full-page loader for actions the user must not interrupt.
 * Rendered by the Fragment global context; trigger it with the
 * `showPageLoading` / `hidePageLoading` global actions or the
 * `usePageLoading` hook rather than mounting it directly.
 */
export function PageLoadingOverlay({ message }: PageLoadingOverlayProps) {
  // Shared ref-counted lock — safe when route + Fragment loaders overlap.
  React.useEffect(() => lockBodyScroll(), []);

  // Block keyboard interaction with the page behind, so a focused button
  // cannot be re-triggered with Enter/Space while a request is in flight.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, []);

  return (
    <div
      className={styles.overlay}
      role="alert"
      aria-live="assertive"
      aria-busy="true"
      data-sayban-page-loading="true"
    >
      {/* The asset is the full lockup (umbrella mark + «سایبان»), so no
          separate wordmark is rendered. */}
      <img
        className={styles.logo}
        src="/plasmic/sayban/images/untitledPicturePng.png"
        alt="سایبان"
      />

      <div className={styles.track}>
        <div className={styles.bar} />
      </div>

      <div className={styles.message}>{message || DEFAULT_MESSAGE}</div>
    </div>
  );
}

export default PageLoadingOverlay;
