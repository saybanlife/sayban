import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import { classNames } from "@plasmicapp/react-web";
import Iconlocation from "../plasmic/sayban/icons/PlasmicIcon__location";
import {
  fetchCurrentAddress,
  fetchUserAddresses,
  selectCurrentAddress
} from "./currentAddressApi";
import {
  addressHasCoords,
  formatAddressChipLabel,
  formatAddressSubtitle,
  type UserAddress
} from "./currentAddressModel";
import styles from "./CurrentAddressChip.module.css";

export type CurrentAddressChipProps = {
  pageBase?: string;
  enabled?: boolean;
  /**
   * "floating" pins the chip to the viewport corner (its original home-landing
   * placement); "header" renders it inline so it can live inside a page header.
   */
  variant?: "floating" | "header";
};

export default function CurrentAddressChip({
  pageBase = "home",
  enabled = true,
  variant = "floating"
}: CurrentAddressChipProps) {
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [savingId, setSavingId] = React.useState<number | null>(null);
  const [current, setCurrent] = React.useState<UserAddress | null>(null);
  const [list, setList] = React.useState<UserAddress[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [selected, addresses] = await Promise.all([
        fetchCurrentAddress(),
        fetchUserAddresses()
      ]);
      setCurrent(selected);
      setList(addresses);
      if (
        selected?.id &&
        !addresses.some(a => Number(a.id) === Number(selected.id))
      ) {
        setList(prev => [selected, ...prev]);
      }
    } catch {
      setCurrent(null);
      setList([]);
      setError("بارگذاری آدرس‌ها ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load, router.asPath]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const onSelect = async (address: UserAddress) => {
    const id = Number(address.id);
    if (!id || savingId) return;
    setSavingId(id);
    setError(null);
    try {
      const next = await selectCurrentAddress(id);
      setCurrent(next || address);
      setList(prev =>
        prev.map(item => ({
          ...item,
          is_current: Number(item.id) === id ? 1 : 0
        }))
      );
      setOpen(false);
      window.dispatchEvent(
        new CustomEvent("sayban:current-address-changed", {
          detail: next || address
        })
      );
    } catch {
      setError("ذخیره آدرس فعلی ناموفق بود.");
    } finally {
      setSavingId(null);
    }
  };

  if (!enabled || !mounted) return null;

  const label = loading ? "آدرس..." : formatAddressChipLabel(current);
  const hint = loading
    ? "در حال بارگذاری"
    : current
      ? addressHasCoords(current)
        ? formatAddressSubtitle(current)
        : "موقعیت نقشه ناقص است"
      : "آدرسی انتخاب نشده";

  const trigger = (
    <div
      className={classNames(
        variant === "header" ? styles.chipInline : styles.chip
      )}
    >
      <button
          type="button"
          className={styles.button}
          onClick={() => {
            setOpen(true);
            void load();
          }}
          aria-label="انتخاب آدرس فعلی"
          title={hint}
        >
          <Iconlocation className={styles.icon} />
          <span className={styles.copy}>
            <span className={styles.title}>{label}</span>
          </span>
          <svg className={styles.chevron} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
          </svg>
      </button>
    </div>
  );

  const sheet = (
    <>
      {open ? (
        <div
          className={styles.overlay}
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label="انتخاب آدرس فعلی"
            onClick={event => event.stopPropagation()}
          >
            <div className={styles.sheetHeader}>
              <div>
                <h2 className={styles.sheetTitle}>آدرس فعلی</h2>
                <p className={styles.sheetSubtitle}>
                  این آدرس برای پیدا کردن مراکز نزدیک‌تر استفاده می‌شود.
                </p>
              </div>
              <button
                type="button"
                className={styles.close}
                onClick={() => setOpen(false)}
              >
                بستن
              </button>
            </div>

            <div className={styles.list}>
              {loading ? (
                <div className={styles.empty}>در حال بارگذاری...</div>
              ) : list.length === 0 ? (
                <div className={styles.empty}>هنوز آدرسی ذخیره نکرده‌اید.</div>
              ) : (
                list.map(item => {
                  const active = Number(current?.id) === Number(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={classNames(
                        styles.row,
                        active && styles.rowActive
                      )}
                      disabled={savingId != null}
                      onClick={() => onSelect(item)}
                    >
                      <span className={styles.rowRadio} aria-hidden />
                      <span className={styles.rowCopy}>
                        <div className={styles.rowTitle}>
                          {item.title || "آدرس"}
                          {active ? " · فعلی" : ""}
                        </div>
                        <div className={styles.rowMeta}>
                          {formatAddressSubtitle(item)}
                          {!addressHasCoords(item)
                            ? " — موقعیت نقشه ثبت نشده"
                            : ""}
                        </div>
                      </span>
                    </button>
                  );
                })
              )}
              {error ? <div className={styles.empty}>{error}</div> : null}
            </div>

            <div className={styles.footerActions}>
              <button
                type="button"
                className={styles.addLink}
                onClick={() => {
                  setOpen(false);
                  router.push(`/${pageBase}/addAddress`);
                }}
              >
                افزودن آدرس جدید
              </button>
              <button
                type="button"
                className={styles.manageLink}
                onClick={() => {
                  setOpen(false);
                  router.push(`/${pageBase}/address`);
                }}
              >
                مدیریت آدرس‌ها
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );

  // The overlay always portals to the body so it can cover a fixed header. The
  // trigger only portals in the floating variant; in the header variant it has
  // to stay in the tree so it can sit inside the header row.
  if (variant === "header") {
    return (
      <>
        {trigger}
        {createPortal(sheet, document.body)}
      </>
    );
  }

  return createPortal(
    <>
      {trigger}
      {sheet}
    </>,
    document.body
  );
}
