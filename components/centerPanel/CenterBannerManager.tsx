import * as React from "react";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import { PANEL_ROUTES } from "@/lib/apiRoutes";
import { uploadPanelImage } from "@/lib/panelLiomUpload";
import { panelAuthConfig } from "./panelClient";
import {
  IMAGE_ACCEPT_ATTR,
  MAX_IMAGE_UPLOAD_MB,
  describeDimensionRejection,
  describeImageRejection,
  readImageDimensions
} from "../uploadLimits";
import {
  DEFAULT_CENTER_BANNER_SRC,
  resolveCenterBannerSrc
} from "../centerPage/centerBanner";
import styles from "./CenterBannerManager.module.css";

const BANNER_RULES = {
  minWidth: 1280,
  minHeight: 720,
  aspectRatio: 16 / 9,
  aspectRatioTolerance: 0.025,
  aspectRatioLabel: "۱۶:۹"
};

type Props = {
  centerId?: string | number;
  token?: string;
  onChanged?: () => void;
};

export default function CenterBannerManager({ centerId, token, onChanged }: Props) {
  const actions = useGlobalActions();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [banner, setBanner] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const request = React.useCallback(async (method: string, url: string, body?: unknown, params?: unknown) => {
    const fn = actions?.["Fragment.apiRequest"] as any;
    if (!fn) throw new Error("ارتباط با سرور در دسترس نیست.");
    return fn(method, url, params, body, panelAuthConfig(token));
  }, [actions, token]);

  const toast = (type: "success" | "error", message: string) =>
    actions?.["Fragment.showToast"]?.(type, message, "top-center");

  const load = React.useCallback(async () => {
    if (!centerId) return;
    setLoading(true);
    try {
      const res = await request("GET", PANEL_ROUTES.center, undefined, { id: centerId });
      const result = res?.data?.result ?? res?.data ?? {};
      setBanner(String(result?.banner_image || "").trim());
    } finally {
      setLoading(false);
    }
  }, [centerId, request]);

  React.useEffect(() => { void load(); }, [load]);

  const saveUrl = async (url: string) => {
    const res = await request("POST", PANEL_ROUTES.updateInfo, {
      info: { id: centerId, banner_image: url || null }
    });
    if (res?.status >= 400 || res?.data?.success === false) {
      throw new Error(res?.data?.message || "ذخیره بنر ناموفق بود.");
    }
    setBanner(url);
    onChanged?.();
  };

  const selectFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !centerId || busy) return;
    setBusy(true);
    try {
      const basic = describeImageRejection(file);
      if (basic) throw new Error(basic);
      const dimensions = await readImageDimensions(file);
      const dimensionError = describeDimensionRejection(dimensions, BANNER_RULES);
      if (dimensionError) throw new Error(dimensionError);
      const url = await uploadPanelImage(file, { token });
      if (!url) throw new Error("آدرس تصویر آپلودشده دریافت نشد.");
      await saveUrl(url);
      toast("success", banner ? "بنر مرکز تغییر کرد." : "بنر مرکز ذخیره شد.");
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "آپلود بنر ناموفق بود.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const restoreDefault = async () => {
    if (!banner || busy) return;
    setBusy(true);
    try {
      await saveUrl("");
      toast("success", "بنر پیش‌فرض سایبان فعال شد.");
    } catch (error) {
      toast("error", error instanceof Error ? error.message : "تغییر بنر ناموفق بود.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <input ref={fileRef} className={styles.hiddenInput} type="file" accept={IMAGE_ACCEPT_ATTR} onChange={e => void selectFile(e.target.files)} />
      <div className={styles.preview} aria-busy={loading}>
        <img className={styles.image} src={resolveCenterBannerSrc({ banner_image: banner })} alt="پیش‌نمایش بنر مرکز" />
        <span className={styles.badge}>{banner ? "بنر اختصاصی" : "بنر پیش‌فرض"}</span>
      </div>
      <div className={styles.actions}>
        <button className={styles.button} type="button" disabled={busy || loading} onClick={() => fileRef.current?.click()}>
          {busy ? "در حال ذخیره..." : banner ? "تغییر بنر" : "انتخاب بنر"}
        </button>
        {banner ? <button className={styles.secondary} type="button" disabled={busy} onClick={() => void restoreDefault()}>بازگشت به بنر پیش‌فرض</button> : null}
      </div>
      <p className={styles.hint}>تصویر افقی با نسبت ۱۶:۹، حداقل ۱۲۸۰×۷۲۰ پیکسل و حداکثر {MAX_IMAGE_UPLOAD_MB} مگابایت؛ فرمت JPG، PNG یا WEBP.</p>
    </div>
  );
}