import * as React from "react";
import styles from "./CenterPreviewCard.module.css";
import { usePanelApi } from "./usePanelApi";
import {
  factsFromCenterResult,
  glanceDisplayRows,
  overviewDisplayRows
} from "./centerFactsSchema";
import { asPanelBool, type CareItemRow, type SpecialistRow } from "./panelApi";
import { isPureNursingCenter } from "../centerPage/centerEnumLocales";
import {
  DOCTOR_TYPE,
  careScheduleDetail,
  doctorKindLabel,
  specialistLabel
} from "../centerPage/careTreatmentVocab";

type CenterPreviewCardProps = {
  centerId?: string | number;
  token?: string;
  refreshKey?: number;
};

type Row = { label: string; value: string };

type PreviewData = {
  name: string;
  mainImage: string;
  isActive: boolean | null;
  category: string;
  rating: string;
  reviewsCount: number;
  location: string;
  address: string;
  contact: Row[];
  facts: Row[];
  counts: { label: string; value: number }[];
  completeness: number;
};

/** Mirrors the «مراقبت و درمان» block on the public page. */
function buildCareRows(
  careItems: CareItemRow[],
  specialists: SpecialistRow[]
): Row[] {
  const rows: Row[] = careItems
    .filter(item => asPanelBool(item.has_it))
    .map(item => ({
      label: String(item.name || "").trim(),
      value: item.note ? String(item.note).trim() : "دارد"
    }))
    .filter(row => row.label);

  for (const row of specialists) {
    const type = String(row.specialist_type || "").trim();
    if (!type) continue;
    const detail =
      type === DOCTOR_TYPE
        ? [doctorKindLabel(row.doctor_kind), careScheduleDetail(row)]
            .filter(Boolean)
            .join(" — ")
        : careScheduleDetail(row) || "";
    rows.push({ label: specialistLabel(type), value: detail || "دارد" });
  }

  return rows;
}

function text(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

function count(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

/** Share of the fields a public center page relies on that are filled in. */
function completenessPercent(src: Record<string, unknown>, facts: Row[]) {
  const nursing = isPureNursingCenter(src.care_domain);
  const required = [
    text(src.name),
    text(src.description),
    text(src.main_image),
    text(src.address),
    text(src.phone),
    nursing ? "1" : text(src.working_hours),
    count(src.image) ? "1" : "",
    count(src.services) ? "1" : ""
  ];
  const filledBase = required.filter(Boolean).length;
  // Overview + glance together contribute the second half of the score.
  const total = required.length + 12;
  return Math.round(((filledBase + facts.length) / total) * 100);
}

function buildPreview(src: Record<string, unknown>): PreviewData {
  const hero =
    text(src.main_image) ||
    text(
      (Array.isArray(src.image) &&
        (src.image[0] as { image_url?: string })?.image_url) ||
        ""
    );

  const parsedFacts = factsFromCenterResult(src);
  const facts = [
    ...overviewDisplayRows(parsedFacts.overview),
    ...glanceDisplayRows(
      parsedFacts.glance,
      parsedFacts.overview.care_domain
    )
  ]
    .filter(row => row.value && row.value !== "—")
    .map(row => ({ label: row.label, value: row.value }));

  const contact: Row[] = [];
  const phone = text(src.phone);
  if (phone) contact.push({ label: "تلفن", value: phone });
  const email = text(src.email);
  if (email) contact.push({ label: "ایمیل", value: email });
  if (!isPureNursingCenter(src.care_domain)) {
    const workingHours = text(src.working_hours);
    if (workingHours) contact.push({ label: "ساعات کاری", value: workingHours });
  }

  const isActiveRaw = src.is_active;
  const isActive =
    isActiveRaw == null ? null : Number(isActiveRaw) === 1 || isActiveRaw === true;

  const reviewsCount = Number(src.reviews_count || 0) || 0;
  const ratingRaw = Number(src.rating_avg || 0) || 0;

  const counts = [
    { label: "تصویر", value: count(src.image) },
    { label: "خدمت", value: count(src.services) },
    { label: "برچسب", value: count(src.tags) }
  ].filter(item => item.value > 0);

  const location = [text(src.state), text(src.city), text(src.area)]
    .filter(Boolean)
    .join("، ");

  return {
    name: text(src.name) || text(src.title) || "مرکز",
    mainImage: hero,
    isActive,
    category: [text(src.category_name), text(src.subcategory_name)]
      .filter(Boolean)
      .join(" / "),
    rating: ratingRaw > 0 ? ratingRaw.toFixed(1) : "",
    reviewsCount,
    location,
    address: text(src.address),
    contact,
    facts,
    counts,
    completeness: completenessPercent(src, facts)
  };
}

export function CenterPreviewCard({
  centerId,
  token,
  refreshKey = 0
}: CenterPreviewCardProps) {
  const api = usePanelApi(token);
  const [data, setData] = React.useState<PreviewData | null>(null);
  const [careRows, setCareRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!centerId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [result, careItems, specialists] = await Promise.all([
          api.fetchCenterFacts(centerId),
          api.fetchCenterCareItems(centerId),
          api.fetchSpecialists(centerId)
        ]);
        if (cancelled) return;
        setData(result ? buildPreview(result) : null);
        setCareRows(buildCareRows(careItems, specialists));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, centerId, refreshKey]);

  const openPreview = () => {
    if (!centerId) return;
    // Public center route uses slug path — never append panel token.
    const url = `/home/center/${encodeURIComponent(String(centerId))}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!centerId) return null;

  return (
    <aside className={styles.card} data-sayban-preview="true">
      <div className={styles.head}>
        <span className={styles.title}>پیش‌نمایش</span>
        {data?.isActive != null ? (
          <span
            className={`${styles.badge} ${
              data.isActive ? styles.badgeOn : styles.badgeOff
            }`}
          >
            {data.isActive ? "فعال" : "غیرفعال"}
          </span>
        ) : null}
      </div>

      {data?.mainImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.mainImage} alt="" className={styles.hero} />
      ) : (
        <div className={styles.heroPlaceholder}>بدون تصویر</div>
      )}

      <div className={styles.name}>{loading ? "…" : data?.name || "مرکز"}</div>
      {data?.category ? (
        <div className={styles.category}>{data.category}</div>
      ) : null}

      {data?.rating || data?.reviewsCount ? (
        <div className={styles.metaRow}>
          {data.rating ? (
            <span className={styles.rating}>★ {data.rating}</span>
          ) : null}
          {data.reviewsCount ? (
            <span className={styles.muted}>{data.reviewsCount} نظر</span>
          ) : null}
        </div>
      ) : null}

      {data ? (
        <div className={styles.progressWrap}>
          <div className={styles.progressHead}>
            <span className={styles.muted}>تکمیل پروفایل</span>
            <span className={styles.progressValue}>{data.completeness}٪</span>
          </div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressBar}
              style={{ width: `${Math.min(100, data.completeness)}%` }}
            />
          </div>
        </div>
      ) : null}

      {data?.counts.length ? (
        <div className={styles.chips}>
          {data.counts.map(item => (
            <span key={item.label} className={styles.chip}>
              {item.value} {item.label}
            </span>
          ))}
        </div>
      ) : null}

      {data?.location || data?.address ? (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>موقعیت</div>
          {data.location ? (
            <div className={styles.value}>{data.location}</div>
          ) : null}
          {data.address ? (
            <div className={styles.address}>{data.address}</div>
          ) : null}
        </div>
      ) : null}

      {data?.contact.length ? (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>تماس</div>
          <ul className={styles.list}>
            {data.contact.map(row => (
              <li key={row.label} className={styles.row}>
                <span className={styles.label}>{row.label}</span>
                <span className={styles.value}>{row.value}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {careRows.length ? (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>مراقبت و درمان</div>
          <ul className={styles.list}>
            {careRows.map(row => (
              <li key={row.label} className={styles.row}>
                <span className={styles.label}>{row.label}</span>
                <span className={styles.value}>{row.value}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data?.facts.length ? (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>مشخصات</div>
          <ul className={styles.list}>
            {data.facts.map(row => (
              <li key={row.label} className={styles.row}>
                <span className={styles.label}>{row.label}</span>
                <span className={styles.value}>{row.value}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!loading && data && !data.facts.length && !data.contact.length ? (
        <div className={styles.empty}>اطلاعات خلاصه هنوز تکمیل نشده است.</div>
      ) : null}

      <button type="button" className={styles.previewBtn} onClick={openPreview}>
        مشاهده صفحه عمومی
      </button>
    </aside>
  );
}

export default CenterPreviewCard;
