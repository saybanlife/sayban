import * as React from "react";
import { useRouter } from "next/router";
import {
  PlasmicHome,
  DefaultHomeProps
} from "./plasmic/sayban/PlasmicHome";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { SwiperSlider } from "@/components/SwiperSlider";
import sliderStyles from "./HomeSlider.module.css";
import {
  HomeSliderItem,
  normalizeHomeSliders,
  runHomeSliderAction
} from "./homeSlider/homeSliderTypes";

export interface HomeProps extends DefaultHomeProps {
  homeSliders?: HomeSliderItem[] | unknown;
}

const PROMO_FALLBACK_IMAGE = "/plasmic/sayban/images/میPng.png";

function Home_(props: HomeProps, ref: HTMLElementRefOf<"div">) {
  const router = useRouter();
  const { homeSliders, ...rest } = props;
  const slides = React.useMemo(
    () =>
      normalizeHomeSliders(homeSliders).filter(
        item => item.is_active === undefined || Number(item.is_active) === 1
      ),
    [homeSliders]
  );

  const promoSliderOverride =
    slides.length > 0
      ? {
          render: (
            renderProps: React.ComponentProps<typeof SwiperSlider>,
            DefaultSwiper: typeof SwiperSlider
          ) => (
            <DefaultSwiper
              {...renderProps}
              autoplay={slides.length > 1}
              loop={slides.length > 1}
              showPagination={slides.length > 1}
              showNavigationButtons={false}
            >
              {slides.map(slide => (
                <button
                  key={slide.id}
                  type="button"
                  className={sliderStyles.promoSliderSlideBtn}
                  onClick={event => {
                    event.stopPropagation();
                    runHomeSliderAction(slide.action, path =>
                      router.push(path)
                    );
                  }}
                >
                  <img
                    alt=""
                    className={sliderStyles.promoSliderSlideImage}
                    loading="lazy"
                    src={slide.image_url}
                  />
                </button>
              ))}
            </DefaultSwiper>
          )
        }
      : {
          render: () => (
            <img
              alt=""
              className={sliderStyles.promoFallbackImage}
              loading="lazy"
              src={PROMO_FALLBACK_IMAGE}
            />
          )
        };

  return (
    <PlasmicHome
      root={{ ref }}
      {...rest}
      overrides={
        {
          homePromoSlider: promoSliderOverride,
          freeBox__dzcLe: {
            props: { style: { display: "none" } }
          }
        } as Record<string, unknown>
      }
    />
  );
}

const Home = React.forwardRef(Home_);
export default Home;
