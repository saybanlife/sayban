import * as React from "react";
import { TextCollapse } from "@/components/TextCollapse";
import styles from "./CenterPage.module.css";
import CenterGalleryLightbox from "./CenterGalleryLightbox";
import {
  CenterResult,
  getFaqItems,
  getSocialLinks
} from "./centerHelpers";
import {
  getCenterGlanceItems,
  getCenterMetaItems
} from "./centerProfileFields";
import { getKeyInfoIcon } from "./serviceIcons";
import ChevronDownIcon from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__ChevronDown";

const META_VISIBLE = 5;

export function CenterMetaOverviewSection({
  result
}: {
  result?: CenterResult;
}) {
  const items = getCenterMetaItems(result);
  const [expanded, setExpanded] = React.useState(false);

  if (!items.length) return null;

  const hasMore = items.length > META_VISIBLE;
  const visibleItems = expanded ? items : items.slice(0, META_VISIBLE);

  return (
    <div id="center-meta" className={`${styles.section} ${styles.iconsDuotone}`}>
      <div className={styles.profileCardGrid}>
        {visibleItems.map((item, idx) => {
          const Icon = getKeyInfoIcon(item, idx);
          return (
            <div className={styles.profileCard} key={item.key}>
              <span className={styles.profileCardIconWrap}>
                <Icon className={styles.profileCardIcon} role="img" aria-hidden />
              </span>
              <div className={styles.profileCardLabel}>{item.label}</div>
              <div className={styles.profileCardValue}>{item.value}</div>
            </div>
          );
        })}
      </div>
      {hasMore ? (
        <div className={styles.sectionToggleRow}>
          <button
            type="button"
            className={styles.sectionAction}
            aria-expanded={expanded}
            onClick={() => setExpanded(c => !c)}
          >
            {expanded ? "نمایش کمتر" : "مشاهده بیشتر"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function CenterSummarySection({
  description
}: {
  description?: string;
}) {
  const text = description || "";
  if (!text.trim()) return null;

  return (
    <div id="center-summary" className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>معرفی مرکز</div>
      </div>
      <TextCollapse
        text={text}
        maxLines={3}
        enableToggle
        className={styles.descriptionCollapse}
        textClassName={styles.descriptionText}
        buttonClassName={styles.descriptionToggle}
      />
    </div>
  );
}

const KEY_INFO_VISIBLE = 5;

export function CenterKeyInfoSection({ result }: { result?: CenterResult }) {
  const items = getCenterGlanceItems(result);
  const [expanded, setExpanded] = React.useState(false);

  if (!items.length) return null;

  const hasMore = items.length > KEY_INFO_VISIBLE;
  const visibleItems = expanded ? items : items.slice(0, KEY_INFO_VISIBLE);

  return (
    <div id="center-keyinfo" className={`${styles.section} ${styles.iconsDuotone}`}>
      <div className={styles.sectionHeaderRow}>
        <div className={styles.sectionTitleCenter}>
          اطلاعات کلیدی در یک نگاه
        </div>
        {hasMore ? (
          <button
            type="button"
            className={styles.sectionAction}
            onClick={() => setExpanded(c => !c)}
          >
            {expanded ? "نمایش کمتر" : "مشاهده بیشتر"}
          </button>
        ) : null}
      </div>
      <div className={styles.profileCardGrid}>
        {visibleItems.map((item, idx) => {
          const Icon = getKeyInfoIcon(item, idx);
          return (
            <div className={styles.profileCard} key={item.key}>
              {item.label ? (
                <div className={styles.profileCardLabel}>{item.label}</div>
              ) : null}
              <span className={styles.profileCardIconWrap}>
                <Icon className={styles.profileCardIcon} role="img" aria-hidden />
              </span>
              {item.value ? (
                <div className={styles.profileCardValue}>{item.value}</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CenterGallerySection({ result }: { result?: CenterResult }) {
  const images = (result?.image || []).filter(img => img?.image_url);
  const imageUrls = images.map(img => img.image_url as string);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [initialIndex, setInitialIndex] = React.useState(0);

  if (!imageUrls.length) return null;

  const remainingCount = Math.max(0, imageUrls.length - 3);
  const showMoreCard = remainingCount > 0;
  const previewCount = showMoreCard ? 3 : Math.min(4, imageUrls.length);

  const openLightbox = (index: number) => {
    setInitialIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div id="center-gallery" className={styles.section}>
      <div className={styles.galleryHeader}>
        <div className={styles.sectionTitle}>تصاویر مرکز</div>
        <button
          type="button"
          className={styles.galleryViewAll}
          onClick={() => openLightbox(0)}
        >
          مشاهده همه
        </button>
      </div>

      <div className={styles.galleryRow}>
        {Array.from({ length: previewCount }).map((_, idx) => {
          const url = imageUrls[idx];
          return (
            <button
              type="button"
              className={styles.galleryCard}
              key={`gallery-${idx}`}
              onClick={() => openLightbox(idx)}
            >
              <img
                alt=""
                className={styles.galleryCardImage}
                loading="lazy"
                src={url}
              />
            </button>
          );
        })}

        {showMoreCard ? (
          <button
            type="button"
            className={`${styles.galleryCard} ${styles.galleryMoreCard}`}
            onClick={() => openLightbox(3)}
          >
            <img
              alt=""
              className={styles.galleryCardImage}
              loading="lazy"
              src={imageUrls[3] || imageUrls[imageUrls.length - 1]}
            />
            <span className={styles.galleryMoreOverlay}>
              <span className={styles.galleryMoreCount}>+{remainingCount}</span>
              <span className={styles.galleryMoreLabel}>تصویر دیگر</span>
            </span>
          </button>
        ) : null}
      </div>

      <CenterGalleryLightbox
        images={imageUrls}
        initialIndex={initialIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}

export function CenterSocialLinks({ result }: { result?: CenterResult }) {
  const { instagramUrl, websiteUrl } = getSocialLinks(result);
  if (!instagramUrl && !websiteUrl) return null;

  return (
    <div className={styles.socialLinks}>
      {instagramUrl ? (
        <a
          className={styles.socialLink}
          href={instagramUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          صفحه اینستاگرام
        </a>
      ) : null}
      {websiteUrl ? (
        <a
          className={styles.socialLink}
          href={websiteUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          وب‌سایت مرکز
        </a>
      ) : null}
    </div>
  );
}

export function CenterFaqSection({ result }: { result?: CenterResult }) {
  const faqItems = getFaqItems(result);
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  if (!faqItems.length) return null;

  const toggleItem = (idx: number) => {
    setOpenIndex(prev => (prev === idx ? null : idx));
  };

  return (
    <div id="center-faq" className={`${styles.section} ${styles.iconsDuotone}`}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>سوالات متداول</div>
      </div>
      <div className={styles.faqList} role="list">
        {faqItems.map((item, idx) => {
          const isOpen = openIndex === idx;
          const question = item.question || item.title || "";
          const answer = item.answer || item.description || item.body || "";
          const panelId = `center-faq-panel-${idx}`;
          const buttonId = `center-faq-button-${idx}`;

          return (
            <div
              className={`${styles.faqItem}${isOpen ? ` ${styles.faqItemOpen}` : ""}`}
              key={idx}
              role="listitem"
            >
              <button
                type="button"
                id={buttonId}
                className={styles.faqQuestion}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggleItem(idx)}
              >
                <span className={styles.faqQuestionText}>{question}</span>
                <ChevronDownIcon
                  className={`${styles.faqChevron}${isOpen ? ` ${styles.faqChevronOpen}` : ""}`}
                  role="img"
                  aria-hidden
                />
              </button>
              <div
                id={panelId}
                className={`${styles.faqAnswerWrap}${isOpen ? ` ${styles.faqAnswerWrapOpen}` : ""}`}
                role="region"
                aria-labelledby={buttonId}
              >
                <div className={styles.faqAnswerInner}>
                  <div className={styles.faqAnswer}>{answer}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
