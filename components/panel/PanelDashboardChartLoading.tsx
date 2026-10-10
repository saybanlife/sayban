import * as React from "react";
import { LottieWrapper } from "@plasmicpkgs/lottie-react";
import animationData from "./assets/panel-dashboard-chart.json";
import styles from "./PanelDashboardChartLoading.module.css";

/**
 * Loading UI for the panel dashboard chart request only
 * (`panel/dashboard/chart`). Unmounts with ApiRequest's loadingDisplay.
 */
export default function PanelDashboardChartLoading() {
  return (
    <div
      className={styles.wrap}
      role="status"
      aria-live="polite"
      aria-label="در حال بارگذاری نمودار"
    >
      <LottieWrapper
        className={styles.lottie}
        animationData={animationData}
        loop
        autoplay
      />
    </div>
  );
}
