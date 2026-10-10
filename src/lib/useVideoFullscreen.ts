/**
 * Fullscreen control for a video, with a Back-button guard.
 *
 * Entering fullscreen pushes a history entry so the phone's Back button (or the
 * browser's back gesture) pops that entry and merely leaves fullscreen, instead
 * of navigating away from the page the video sits on. Leaving fullscreen by any
 * other means (native control, Esc) pops the entry back off so the history stack
 * does not accumulate.
 *
 * iOS Safari is handled separately: it cannot fullscreen an arbitrary container,
 * only the media element itself via `webkitEnterFullscreen`, and it reports state
 * through `webkitbegin/endfullscreen` rather than `fullscreenchange`.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const HISTORY_FLAG = "saybanVideoFullscreen";

type WebkitVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
};

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void;
};

type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => void;
};

function fullscreenElement(): Element | null {
  if (typeof document === "undefined") return null;
  const doc = document as WebkitDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function useVideoFullscreen(
  containerRef: React.RefObject<HTMLElement | null>,
  videoRef: React.RefObject<HTMLVideoElement | null>
) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  /** True while we are the owner of a pushed history entry. */
  const ownsHistoryRef = useRef(false);
  /** Guards the popstate handler against the back() we trigger ourselves. */
  const suppressPopRef = useRef(false);

  const enter = useCallback(() => {
    const container = containerRef.current as WebkitElement | null;
    const video = videoRef.current as WebkitVideo | null;

    if (container?.requestFullscreen) {
      void container.requestFullscreen().catch(() => undefined);
    } else if (container?.webkitRequestFullscreen) {
      container.webkitRequestFullscreen();
    } else if (video?.webkitEnterFullscreen) {
      // iOS Safari: only the media element can go fullscreen.
      video.webkitEnterFullscreen();
    }
    // The history entry is pushed only once fullscreen is confirmed active (see
    // the effect below). Pushing it here would leave a stray entry behind
    // whenever the request is rejected, turning the next Back into a no-op.
  }, [containerRef, videoRef]);

  const exit = useCallback(() => {
    const doc = document as WebkitDocument;
    const video = videoRef.current as WebkitVideo | null;
    if (doc.fullscreenElement && doc.exitFullscreen) {
      void doc.exitFullscreen().catch(() => undefined);
    } else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
      doc.webkitExitFullscreen();
    } else if (video?.webkitDisplayingFullscreen && video.webkitExitFullscreen) {
      video.webkitExitFullscreen();
    }
  }, [videoRef]);

  const toggle = useCallback(() => {
    if (fullscreenElement() || (videoRef.current as WebkitVideo | null)?.webkitDisplayingFullscreen) {
      exit();
    } else {
      enter();
    }
  }, [enter, exit, videoRef]);

  useEffect(() => {
    const container = containerRef.current;
    const video = videoRef.current;

    const claimHistory = () => {
      if (ownsHistoryRef.current) return;
      try {
        window.history.pushState(
          { ...(window.history.state || {}), [HISTORY_FLAG]: true },
          ""
        );
        ownsHistoryRef.current = true;
      } catch {
        // History is best-effort; fullscreen still works without the guard.
      }
    };

    const releaseHistory = () => {
      if (!ownsHistoryRef.current) return;
      ownsHistoryRef.current = false;
      // Pop the entry we pushed, without letting our own handler treat it as a
      // user-initiated Back.
      if (window.history.state?.[HISTORY_FLAG]) {
        suppressPopRef.current = true;
        try {
          window.history.back();
        } catch {
          suppressPopRef.current = false;
        }
      }
    };

    const syncState = () => {
      const active = Boolean(
        fullscreenElement() &&
          (!container || fullscreenElement() === container || container.contains(fullscreenElement() as Node))
      );
      setIsFullscreen(active);
      if (active) claimHistory();
      else releaseHistory();
    };

    const onIosBegin = () => {
      setIsFullscreen(true);
      claimHistory();
    };
    const onIosEnd = () => {
      setIsFullscreen(false);
      releaseHistory();
    };

    const onPopState = () => {
      if (suppressPopRef.current) {
        suppressPopRef.current = false;
        return;
      }
      // Back pressed while fullscreen: consume it by exiting only.
      if (fullscreenElement() || (video as WebkitVideo | null)?.webkitDisplayingFullscreen) {
        ownsHistoryRef.current = false;
        exit();
      }
    };

    document.addEventListener("fullscreenchange", syncState);
    document.addEventListener("webkitfullscreenchange", syncState);
    window.addEventListener("popstate", onPopState);
    video?.addEventListener("webkitbeginfullscreen", onIosBegin);
    video?.addEventListener("webkitendfullscreen", onIosEnd);

    return () => {
      document.removeEventListener("fullscreenchange", syncState);
      document.removeEventListener("webkitfullscreenchange", syncState);
      window.removeEventListener("popstate", onPopState);
      video?.removeEventListener("webkitbeginfullscreen", onIosBegin);
      video?.removeEventListener("webkitendfullscreen", onIosEnd);
    };
  }, [containerRef, videoRef, exit]);

  return { isFullscreen, enter, exit, toggle };
}
