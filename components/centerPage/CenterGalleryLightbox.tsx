import * as React from "react";
import { createPortal } from "react-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode, Keyboard } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
import { lockBodyScroll } from "@/lib/bodyScrollLock";
import styles from "./CenterPage.module.css";

type CenterGalleryLightboxProps = {
  images: string[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
};

export default function CenterGalleryLightbox({
  images,
  initialIndex,
  open,
  onClose
}: CenterGalleryLightboxProps) {
  const [activeIndex, setActiveIndex] = React.useState(initialIndex);
  const mainSwiperRef = React.useRef<SwiperType | null>(null);
  const thumbSwiperRef = React.useRef<SwiperType | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    setActiveIndex(initialIndex);
    return lockBodyScroll();
  }, [open, initialIndex]);

  React.useEffect(() => {
    if (!open || !mainSwiperRef.current) return;
    mainSwiperRef.current.slideTo(initialIndex, 0);
    setActiveIndex(initialIndex);
  }, [open, initialIndex]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const goToSlide = (index: number) => {
    mainSwiperRef.current?.slideTo(index);
    setActiveIndex(index);
    thumbSwiperRef.current?.slideTo(index);
  };

  if (!mounted || !open || !images.length) return null;

  return createPortal(
    <div
      className={`${styles.lightboxOverlay} page`}
      role="dialog"
      aria-modal="true"
      aria-label="گالری تصاویر مرکز"
      onClick={onClose}
    >
      <button
        type="button"
        className={styles.lightboxClose}
        aria-label="بستن"
        onClick={onClose}
      >
        ×
      </button>

      <div
        className={styles.lightboxContent}
        onClick={event => event.stopPropagation()}
      >
        <div className={styles.lightboxMainArea}>
          <Swiper
            className={styles.lightboxMainSwiper}
            dir="rtl"
            initialSlide={initialIndex}
            keyboard={{ enabled: true }}
            modules={[Keyboard]}
            onSlideChange={swiper => {
              setActiveIndex(swiper.activeIndex);
              thumbSwiperRef.current?.slideTo(swiper.activeIndex);
            }}
            onSwiper={swiper => {
              mainSwiperRef.current = swiper;
            }}
            slidesPerView={1}
            spaceBetween={0}
          >
            {images.map((src, index) => (
              <SwiperSlide key={`${src}-${index}`}>
                <div className={styles.lightboxMainSlide}>
                  <img
                    alt=""
                    className={styles.lightboxMainImage}
                    src={src}
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          <button
            type="button"
            className={`${styles.lightboxNavBtn} ${styles.lightboxNavPrev}`}
            aria-label="تصویر قبلی"
            onClick={() => mainSwiperRef.current?.slidePrev()}
          />
          <button
            type="button"
            className={`${styles.lightboxNavBtn} ${styles.lightboxNavNext}`}
            aria-label="تصویر بعدی"
            onClick={() => mainSwiperRef.current?.slideNext()}
          />
        </div>

        <div className={styles.lightboxThumbsWrap}>
          <Swiper
            className={styles.lightboxThumbsSwiper}
            dir="rtl"
            freeMode
            modules={[FreeMode]}
            onSwiper={swiper => {
              thumbSwiperRef.current = swiper;
            }}
            slidesPerView="auto"
            spaceBetween={8}
            watchSlidesProgress
          >
            {images.map((src, index) => (
              <SwiperSlide
                className={styles.lightboxThumbSlide}
                key={`thumb-${src}-${index}`}
              >
                <button
                  type="button"
                  className={`${styles.lightboxThumbBtn} ${
                    index === activeIndex ? styles.lightboxThumbBtnActive : ""
                  }`}
                  onClick={() => goToSlide(index)}
                >
                  <img
                    alt=""
                    className={styles.lightboxThumbImage}
                    src={src}
                  />
                </button>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </div>,
    document.body
  );
}
