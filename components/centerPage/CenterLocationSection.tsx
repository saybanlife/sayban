import * as React from "react";
import { Iframe } from "@plasmicpkgs/plasmic-basic-components";
import styles from "./CenterPage.module.css";
import {
  CenterResult,
  getDirectionsUrl,
  getSocialLinks,
  getSocialDisplayLabel,
  normalizeExternalUrl
} from "./centerHelpers";
import { getNeshanEmbedSrc, getNeshanPlaceUrl } from "./neshanLinks";
import BrandInstagramIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__BrandInstagram";
import WorldWwwIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__WorldWww";
import ArrowUpLeftIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__ArrowUpLeft";

function LazyNeshanMap({ src }: { src: string }) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px", threshold: 0.01 }
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef} className={styles.mapWrap}>
      {visible ? (
        <Iframe
          className={styles.mapIframe}
          preview={true}
          src={src}
          useHtml={false}
        />
      ) : (
        <div className={styles.mapIframe} aria-hidden />
      )}
    </div>
  );
}

export function CenterLocationSection({ result }: { result?: CenterResult }) {
  const address = result?.address || "";
  const lat = result?.latitude;
  const lng = result?.longitude;
  const mapSrc = getNeshanEmbedSrc(lat, lng);
  const neshanHref = getNeshanPlaceUrl(lat, lng);
  const { instagramUrl, websiteUrl } = getSocialLinks(result);
  const instagramHref = normalizeExternalUrl(instagramUrl, "instagram");
  const websiteHref = normalizeExternalUrl(websiteUrl, "website");
  const [directionsUrl, setDirectionsUrl] = React.useState("");

  React.useEffect(() => {
    setDirectionsUrl(getDirectionsUrl(lat, lng, result?.name));
  }, [lat, lng, result?.name]);

  if (!address && !mapSrc && !instagramHref && !websiteHref) return null;

  return (
    <div id="center-about" className={`${styles.section} ${styles.iconsDuotone}`}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>موقعیت مکانی</div>
      </div>

      <div className={styles.locationContent}>
        {mapSrc ? <LazyNeshanMap src={mapSrc} /> : null}

        {address ? (
          <p className={styles.locationAddress}>{address}</p>
        ) : null}

        <div className={styles.locationActions}>
          {neshanHref ? (
            <a
              className={styles.directionsBtn}
              href={neshanHref}
              rel="noopener noreferrer"
              target="_blank"
            >
              مشاهده در نشان
            </a>
          ) : null}
          {directionsUrl ? (
            <a
              className={styles.directionsBtn}
              href={directionsUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ArrowUpLeftIcon className={styles.directionsBtnIcon} role="img" />
              مسیریابی
            </a>
          ) : null}
        </div>

        {instagramHref || websiteHref ? (
          <div className={styles.locationSocialRow}>
            {instagramHref ? (
              <a
                className={styles.locationSocialLink}
                href={instagramHref}
                rel="noopener noreferrer"
                target="_blank"
              >
                <BrandInstagramIcon
                  className={styles.locationSocialIcon}
                  role="img"
                />
                <span className={styles.locationSocialLabel}>
                  {getSocialDisplayLabel(instagramUrl, "instagram")}
                </span>
              </a>
            ) : null}
            {websiteHref ? (
              <a
                className={styles.locationSocialLink}
                href={websiteHref}
                rel="noopener noreferrer"
                target="_blank"
              >
                <WorldWwwIcon
                  className={styles.locationSocialIcon}
                  role="img"
                />
                <span className={styles.locationSocialLabel}>
                  {getSocialDisplayLabel(websiteUrl, "website")}
                </span>
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default CenterLocationSection;
