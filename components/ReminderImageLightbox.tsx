import * as React from "react";
import { createPortal } from "react-dom";
import { lockBodyScroll } from "@/lib/bodyScrollLock";
import styles from "./ReminderImageLightbox.module.css";

type Props = {
  src: string | null;
  onClose: () => void;
};

/**
 * Full-viewport photo viewer — portaled to body so Homepage Menu2 (z≈40–9999)
 * cannot paint over the image.
 */
export default function ReminderImageLightbox({ src, onClose }: Props) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!src) return;
    const unlock = lockBodyScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      unlock();
    };
  }, [src, onClose]);

  if (!src || !mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="نمایش تصویر یادآوری"
      data-reminder-lightbox="1"
      onClick={onClose}
    >
      <button
        type="button"
        className={styles.close}
        aria-label="بستن"
        onClick={e => {
          e.stopPropagation();
          onClose();
        }}
      >
        ×
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className={styles.image}
        onClick={e => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}
