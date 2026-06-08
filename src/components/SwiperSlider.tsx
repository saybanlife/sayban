import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import type { Swiper as SwiperType } from "swiper";
import { CodeComponentMeta } from "@plasmicapp/host";

type SwiperSliderProps = {
  children?: React.ReactNode;
  loop?: boolean;
  autoplay?: boolean;
  autoplayDelay?: number;
  showPagination?: boolean;
  bulletColor?: string;
  activeBulletColor?: string;
  className?: string;
  showNavigationButtons?: boolean;
  prevButtonSlot?: React.ReactNode;
  nextButtonSlot?: React.ReactNode;

  lockSlides?: boolean;
  onLockSlidesChange?: (locked: boolean) => void;

  disablePaginationClick?: boolean;

  activeSlideIndex?: number;
  onActiveSlideIndexChange?: (index: number) => void;
};

export const SwiperSlider = forwardRef((props: SwiperSliderProps, ref) => {
  const {
    children,
    loop = true,
    autoplay = true,
    autoplayDelay = 3000,
    showPagination = true,
    bulletColor = "#888888",
    activeBulletColor = "#ffffff",
    className,
    showNavigationButtons = true,
    prevButtonSlot,
    nextButtonSlot,
    lockSlides = false,
    onLockSlidesChange,
    disablePaginationClick = false,
    activeSlideIndex = 0,
    onActiveSlideIndexChange,
  } = props;

  const swiperRef = useRef<SwiperType | null>(null);
  const slides = React.Children.toArray(children);

  // Sync with external index
  useEffect(() => {
    if (
      swiperRef.current &&
      swiperRef.current.realIndex !== activeSlideIndex
    ) {
      swiperRef.current.slideToLoop(activeSlideIndex);
    }
  }, [activeSlideIndex]);

  // Lock slide, autoplay, and pagination bullet clicks
  useEffect(() => {
    if (!swiperRef.current) return;

    swiperRef.current.allowSlideNext = !lockSlides;
    // swiperRef.current.allowSlidePrev = true;

    if (lockSlides) {
      swiperRef.current.autoplay?.stop();
    } else if (autoplay) {
      swiperRef.current.autoplay?.start();
    }

    const paginationEl = swiperRef.current.pagination?.el as HTMLElement;
    if (paginationEl) {
      if (disablePaginationClick) {
        paginationEl.classList.add("no-pointer-events");
      } else {
        paginationEl.classList.remove("no-pointer-events");
      }
    }
  }, [lockSlides, autoplay, disablePaginationClick]);

  useImperativeHandle(ref, () => ({
    slideTo: (index: number) => {
      swiperRef.current?.slideToLoop(index);
    },
  }));

  const handlePrev = () => {
    // if (!lockSlides) {
      swiperRef.current?.slidePrev();
    // }
  };

  const handleNext = () => {
    if (!lockSlides) {
    console.log("next");
      swiperRef.current?.slideNext();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <style>
        {`
          .swiper-pagination-bullet {
            background-color: ${bulletColor} !important;
            opacity: 0.5;
          }
          .swiper-pagination-bullet-active {
            background-color: ${activeBulletColor} !important;
            opacity: 1;
          }
          .no-pointer-events {
            pointer-events: none;
          }
        `}
      </style>

      <Swiper
        dir="ltr"
        loop={loop}
        autoplay={autoplay ? { delay: autoplayDelay } : false}
        pagination={showPagination ? { clickable: true } : false}
        modules={[Autoplay, Pagination]}
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
          swiper.el.classList.remove("swiper-rtl");
          swiper.el.setAttribute("dir", "ltr");

          swiper.allowSlideNext = !lockSlides;
          // swiper.allowSlidePrev = true;
        }}
        onSlideChange={(swiper) => {
          onActiveSlideIndexChange?.(swiper.realIndex);
        }}
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={index}>{slide}</SwiperSlide>
        ))}
      </Swiper>

      {showNavigationButtons && (
        <>
          {(loop || activeSlideIndex > 0) && (
            <div
              onClick={handlePrev}
              className="absolute bottom-4 left-4 z-10 cursor-pointer"
            >
              {prevButtonSlot || (
                <button className="bg-black/50 text-white px-3 py-2 rounded-full">
                  ◀
                </button>
              )}
            </div>
          )}

          {(loop || activeSlideIndex < slides.length - 1) && (
            <div
              onClick={handleNext}
              className="absolute bottom-4 right-4 z-10 cursor-pointer"
            >
              {nextButtonSlot || (
                <button className="bg-black/50 text-white px-3 py-2 rounded-full">
                  ▶
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
});

export const SwiperSliderMeta: CodeComponentMeta<SwiperSliderProps> = {
  name: "SwiperSlider",
  importPath: "@/components/SwiperSlider",
  props: {
    children: {
      type: "slot",
      defaultValue: [
        { type: "text", value: "Slide 1" },
        { type: "text", value: "Slide 2" },
        { type: "text", value: "Slide 3" },
      ],
    },
    loop: { type: "boolean", defaultValue: true },
    autoplay: { type: "boolean", defaultValue: true },
    autoplayDelay: { type: "number", defaultValue: 3000 },
    showPagination: { type: "boolean", defaultValue: true },
    bulletColor: {
      type: "color",
      defaultValue: "#888888",
    },
    activeBulletColor: {
      type: "color",
      defaultValue: "#ffffff",
    },
    className: { type: "class" },
    showNavigationButtons: {
      type: "boolean",
      displayName: "Show Navigation Buttons",
      defaultValue: true,
    },
    prevButtonSlot: {
      type: "slot",
      displayName: "Previous Button",
    },
    nextButtonSlot: {
      type: "slot",
      displayName: "Next Button",
    },
    activeSlideIndex: {
      type: "number",
      displayName: "Active Slide Index",
      description: "0-based index of the current slide",
      defaultValue: 0,
    },
    onActiveSlideIndexChange: {
      type: "eventHandler",
      displayName: "On Slide Change",
      argTypes: [{ name: "index", type: "number" }],
    },
    lockSlides: {
      type: "boolean",
      displayName: "Lock Slide Movement",
      defaultValue: false,
    },
    onLockSlidesChange: {
      type: "eventHandler",
      displayName: "On LockSlides Change",
      argTypes: [{ name: "locked", type: "boolean" }],
    },
    disablePaginationClick: {
      type: "boolean",
      displayName: "Disable Pagination Click",
      description: "Prevents users from clicking on pagination bullets",
      defaultValue: false,
    },
  },
  states: {
    activeSlideIndex: {
      type: "writable",
      variableType: "number",
      valueProp: "activeSlideIndex",
      onChangeProp: "onActiveSlideIndexChange",
    },
    lockSlides: {
      type: "writable",
      variableType: "boolean",
      valueProp: "lockSlides",
      onChangeProp: "onLockSlidesChange",
    },
  },
};
