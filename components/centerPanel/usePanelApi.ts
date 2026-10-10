import * as React from "react";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import { PANEL_ROUTES } from "@/lib/apiRoutes";
import {
  buildCreateFaqBody,
  buildCustomAmenityBody,
  buildUpdateFaqBody,
  extractPanelResult,
  panelAuthConfig,
  type PanelFaqItem,
  type PanelRequestMethod
} from "./panelClient";
import type {
  ActivityLibraryItem,
  ActivitySyncItem,
  AmenityLibraryItem,
  CareItemRow,
  CareItemSyncItem,
  CenterFaqPayload,
  CustomAmenityRequestPayload,
  DailyScheduleRow,
  DailyScheduleUpdatePayload,
  SpecialistPayload,
  SpecialistRow,
  VisitPolicyRow,
  VisitPolicyUpdatePayload
} from "./panelApi";

type FragmentResponse = {
  data?: {
    success?: boolean;
    message?: string;
    error?: string;
    result?: unknown;
    [key: string]: unknown;
  };
  status?: number;
};

/**
 * All center-panel reads/writes go through Fragment.apiRequest / Fragment.showToast —
 * the same transport used by PlasmicCenterPage and the rest of the panel.
 */
export function usePanelApi(token?: string) {
  const globalActions = useGlobalActions();

  const apiRequest = React.useCallback(
    async (
      method: PanelRequestMethod,
      url: string,
      params?: Record<string, any>,
      body?: Record<string, any>
    ) => {
      const request = globalActions?.["Fragment.apiRequest"] as
        | ((
            method: PanelRequestMethod,
            url: string,
            params?: Record<string, any>,
            body?: Record<string, any>,
            config?: Record<string, any>
          ) => Promise<FragmentResponse | undefined>)
        | undefined;

      if (!request) {
        globalActions?.["Fragment.showToast"]?.(
          "error",
          "Fragment.apiRequest در دسترس نیست.",
          "top-center"
        );
        return undefined;
      }

      // Positional args match Plasmic: method, url, params, body, config?
      return request(method, url, params, body, panelAuthConfig(token));
    },
    [globalActions, token]
  );

  const showToast = React.useCallback(
    (type: "success" | "error", message: string) => {
      globalActions?.["Fragment.showToast"]?.(type, message, "top-center");
    },
    [globalActions]
  );

  /** Plasmic-style gate: success via data.success, toast via Fragment.showToast. */
  const mutate = React.useCallback(
    async (
      method: PanelRequestMethod,
      url: string,
      body: Record<string, any> | undefined,
      successMessage: string,
      errorMessage: string,
      params?: Record<string, any>
    ) => {
      const res = await apiRequest(method, url, params, body);
      if (res?.data?.success) {
        showToast(
          "success",
          (typeof res.data.message === "string" && res.data.message) ||
            successMessage
        );
        return true;
      }
      const msg =
        (res?.data &&
          (typeof res.data.message === "string"
            ? res.data.message
            : typeof res.data.error === "string"
              ? res.data.error
              : null)) ||
        errorMessage;
      showToast("error", msg);
      return false;
    },
    [apiRequest, showToast]
  );

  const fetchCenterFaqs = React.useCallback(
    async (centerId: string | number) => {
      const res = await apiRequest("GET", PANEL_ROUTES.faqs, {
        center_id: centerId
      });
      if (!res?.data?.success && res?.data?.success !== undefined) {
        showToast("error", "بارگذاری سوالات متداول ناموفق بود.");
        return [] as PanelFaqItem[];
      }
      // Some list endpoints return the array as result without a success flag.
      if (res?.status && res.status >= 400) {
        showToast("error", "بارگذاری سوالات متداول ناموفق بود.");
        return [] as PanelFaqItem[];
      }
      const result = extractPanelResult<PanelFaqItem[]>(res?.data);
      return Array.isArray(result) ? result : [];
    },
    [apiRequest, showToast]
  );

  const createCenterFaq = React.useCallback(
    (payload: CenterFaqPayload) =>
      mutate(
        "POST",
        PANEL_ROUTES.faqsAdd,
        buildCreateFaqBody(payload),
        "سؤال جدید اضافه شد.",
        "ذخیره سؤال ناموفق بود."
      ),
    [mutate]
  );

  const updateCenterFaq = React.useCallback(
    (
      payload: Required<Pick<CenterFaqPayload, "id">> &
        Omit<CenterFaqPayload, "center_id">
    ) =>
      mutate(
        "POST",
        PANEL_ROUTES.faqsUpdate,
        buildUpdateFaqBody(payload),
        "سؤال با موفقیت ویرایش شد.",
        "ذخیره سؤال ناموفق بود."
      ),
    [mutate]
  );

  const deleteCenterFaq = React.useCallback(
    (id: number) =>
      mutate(
        "POST",
        PANEL_ROUTES.faqsDelete,
        { id },
        "سؤال حذف شد.",
        "حذف سؤال ناموفق بود."
      ),
    [mutate]
  );

  const fetchAmenitiesLibrary = React.useCallback(async () => {
    const res = await apiRequest("GET", PANEL_ROUTES.amenitiesLibrary);
    if (res?.status && res.status >= 400) {
      showToast("error", "بارگذاری امکانات ناموفق بود.");
      return [] as AmenityLibraryItem[];
    }
    if (!res?.data?.success && res?.data?.success !== undefined) {
      showToast("error", "بارگذاری امکانات ناموفق بود.");
      return [] as AmenityLibraryItem[];
    }
    const result = extractPanelResult<AmenityLibraryItem[]>(res?.data);
    return Array.isArray(result) ? result : [];
  }, [apiRequest, showToast]);

  const fetchCenterAmenities = React.useCallback(
    async (centerId: string | number) => {
      const res = await apiRequest("GET", PANEL_ROUTES.amenities, {
        center_id: centerId
      });
      if (res?.status && res.status >= 400) {
        showToast("error", "بارگذاری امکانات ناموفق بود.");
        return [] as AmenityLibraryItem[];
      }
      if (!res?.data?.success && res?.data?.success !== undefined) {
        showToast("error", "بارگذاری امکانات ناموفق بود.");
        return [] as AmenityLibraryItem[];
      }
      const result = extractPanelResult<AmenityLibraryItem[]>(res?.data);
      return Array.isArray(result) ? result : [];
    },
    [apiRequest, showToast]
  );

  const syncCenterAmenities = React.useCallback(
    (centerId: string | number, amenityIds: number[]) =>
      mutate(
        "POST",
        PANEL_ROUTES.amenitiesSync,
        { center_id: centerId, amenity_ids: amenityIds },
        "امکانات مرکز ذخیره شد.",
        "ذخیره امکانات ناموفق بود."
      ),
    [mutate]
  );

  const requestCustomAmenity = React.useCallback(
    (payload: CustomAmenityRequestPayload) =>
      mutate(
        "POST",
        PANEL_ROUTES.amenitiesRequest,
        buildCustomAmenityBody(payload),
        "درخواست شما برای تیم پشتیبانی ارسال شد.",
        "ارسال درخواست ناموفق بود."
      ),
    [mutate]
  );

  const updateCenterSocialLinks = React.useCallback(
    (centerId: string | number, instagramUrl: string, websiteUrl: string) =>
      mutate(
        "POST",
        PANEL_ROUTES.updateInfo,
        {
          info: {
            id: centerId,
            instagram_url: instagramUrl,
            website_url: websiteUrl
          }
        },
        "لینک‌های اینستاگرام و وب‌سایت ذخیره شد.",
        "ذخیره لینک‌ها ناموفق بود."
      ),
    [mutate]
  );

  const fetchCenterFacts = React.useCallback(
    async (centerId: string | number) => {
      const centerRes = await apiRequest("GET", PANEL_ROUTES.center, {
        id: centerId
      });
      return (
        extractPanelResult<Record<string, unknown>>(centerRes?.data) || null
      );
    },
    [apiRequest]
  );

  const updateCenterFacts = React.useCallback(
    (centerId: string | number, fields: Record<string, unknown>) =>
      mutate(
        "POST",
        PANEL_ROUTES.updateInfo,
        {
          info: {
            id: centerId,
            ...fields
          }
        },
        "اطلاعات مرکز با موفقیت ذخیره شد.",
        "ذخیره اطلاعات مرکز ناموفق بود."
      ),
    [mutate]
  );

  const fetchList = React.useCallback(
    async <T,>(
      url: string,
      params?: Record<string, any>,
      errorMessage = "بارگذاری اطلاعات ناموفق بود."
    ) => {
      const res = await apiRequest("GET", url, params);
      if (res?.status && res.status >= 400) {
        showToast("error", errorMessage);
        return [] as T[];
      }
      if (!res?.data?.success && res?.data?.success !== undefined) {
        showToast("error", errorMessage);
        return [] as T[];
      }
      const result = extractPanelResult<T[]>(res?.data);
      return Array.isArray(result) ? result : [];
    },
    [apiRequest, showToast]
  );

  const fetchOne = React.useCallback(
    async <T,>(
      url: string,
      params?: Record<string, any>,
      errorMessage = "بارگذاری اطلاعات ناموفق بود."
    ) => {
      const res = await apiRequest("GET", url, params);
      if (res?.status && res.status >= 400) {
        showToast("error", errorMessage);
        return null as T | null;
      }
      if (!res?.data?.success && res?.data?.success !== undefined) {
        showToast("error", errorMessage);
        return null as T | null;
      }
      return extractPanelResult<T>(res?.data) ?? null;
    },
    [apiRequest, showToast]
  );

  const fetchCareItemsLibrary = React.useCallback(
    () =>
      fetchList<CareItemRow>(
        PANEL_ROUTES.careItemsLibrary,
        undefined,
        "بارگذاری فهرست مراقبت ناموفق بود."
      ),
    [fetchList]
  );

  const fetchCenterCareItems = React.useCallback(
    (centerId: string | number) =>
      fetchList<CareItemRow>(
        PANEL_ROUTES.careItems,
        { center_id: centerId },
        "بارگذاری مراقبت مرکز ناموفق بود."
      ),
    [fetchList]
  );

  const syncCenterCareItems = React.useCallback(
    (centerId: string | number, items: CareItemSyncItem[]) =>
      mutate(
        "POST",
        PANEL_ROUTES.careItemsSync,
        { center_id: centerId, items },
        "موارد مراقبت ذخیره شد.",
        "ذخیره مراقبت ناموفق بود."
      ),
    [mutate]
  );

  const fetchSpecialists = React.useCallback(
    (centerId: string | number) =>
      fetchList<SpecialistRow>(
        PANEL_ROUTES.specialists,
        { center_id: centerId },
        "بارگذاری متخصصان ناموفق بود."
      ),
    [fetchList]
  );

  const createSpecialist = React.useCallback(
    (payload: SpecialistPayload) =>
      mutate(
        "POST",
        PANEL_ROUTES.specialistsAdd,
        payload,
        "متخصص اضافه شد.",
        "افزودن متخصص ناموفق بود."
      ),
    [mutate]
  );

  const updateSpecialist = React.useCallback(
    (payload: Required<Pick<SpecialistPayload, "id">> & SpecialistPayload) =>
      mutate(
        "POST",
        PANEL_ROUTES.specialistsUpdate,
        payload,
        "متخصص ویرایش شد.",
        "ویرایش متخصص ناموفق بود."
      ),
    [mutate]
  );

  const deleteSpecialist = React.useCallback(
    (id: number) =>
      mutate(
        "POST",
        PANEL_ROUTES.specialistsDelete,
        { id },
        "متخصص حذف شد.",
        "حذف متخصص ناموفق بود."
      ),
    [mutate]
  );

  const fetchDailySchedule = React.useCallback(
    (centerId: string | number) =>
      fetchOne<DailyScheduleRow>(
        PANEL_ROUTES.dailySchedule,
        { center_id: centerId },
        "بارگذاری برنامه روزانه ناموفق بود."
      ),
    [fetchOne]
  );

  const updateDailySchedule = React.useCallback(
    (payload: DailyScheduleUpdatePayload) =>
      mutate(
        "POST",
        PANEL_ROUTES.dailyScheduleUpdate,
        payload,
        "برنامه روزانه ذخیره شد.",
        "ذخیره برنامه روزانه ناموفق بود."
      ),
    [mutate]
  );

  const fetchActivitiesLibrary = React.useCallback(
    () =>
      fetchList<ActivityLibraryItem>(
        PANEL_ROUTES.activitiesLibrary,
        undefined,
        "بارگذاری فعالیت‌ها ناموفق بود."
      ),
    [fetchList]
  );

  const fetchCenterActivities = React.useCallback(
    (centerId: string | number) =>
      fetchList<ActivityLibraryItem>(
        PANEL_ROUTES.activities,
        { center_id: centerId },
        "بارگذاری فعالیت‌های مرکز ناموفق بود."
      ),
    [fetchList]
  );

  const syncCenterActivities = React.useCallback(
    (
      centerId: string | number,
      activityIds: Array<number | ActivitySyncItem>
    ) =>
      mutate(
        "POST",
        PANEL_ROUTES.activitiesSync,
        { center_id: centerId, activity_ids: activityIds },
        "فعالیت‌ها ذخیره شد.",
        "ذخیره فعالیت‌ها ناموفق بود."
      ),
    [mutate]
  );

  const fetchVisitPolicy = React.useCallback(
    (centerId: string | number) =>
      fetchOne<VisitPolicyRow>(
        PANEL_ROUTES.visitPolicy,
        { center_id: centerId },
        "بارگذاری سیاست ملاقات ناموفق بود."
      ),
    [fetchOne]
  );

  const updateVisitPolicy = React.useCallback(
    (payload: VisitPolicyUpdatePayload) =>
      mutate(
        "POST",
        PANEL_ROUTES.visitPolicyUpdate,
        payload,
        "سیاست ملاقات ذخیره شد.",
        "ذخیره سیاست ملاقات ناموفق بود."
      ),
    [mutate]
  );

  return React.useMemo(
    () => ({
      fetchCenterFaqs,
      createCenterFaq,
      updateCenterFaq,
      deleteCenterFaq,
      fetchAmenitiesLibrary,
      fetchCenterAmenities,
      syncCenterAmenities,
      requestCustomAmenity,
      updateCenterSocialLinks,
      fetchCenterFacts,
      updateCenterFacts,
      fetchCareItemsLibrary,
      fetchCenterCareItems,
      syncCenterCareItems,
      fetchSpecialists,
      createSpecialist,
      updateSpecialist,
      deleteSpecialist,
      fetchDailySchedule,
      updateDailySchedule,
      fetchActivitiesLibrary,
      fetchCenterActivities,
      syncCenterActivities,
      fetchVisitPolicy,
      updateVisitPolicy
    }),
    [
      fetchCenterFaqs,
      createCenterFaq,
      updateCenterFaq,
      deleteCenterFaq,
      fetchAmenitiesLibrary,
      fetchCenterAmenities,
      syncCenterAmenities,
      requestCustomAmenity,
      updateCenterSocialLinks,
      fetchCenterFacts,
      updateCenterFacts,
      fetchCareItemsLibrary,
      fetchCenterCareItems,
      syncCenterCareItems,
      fetchSpecialists,
      createSpecialist,
      updateSpecialist,
      deleteSpecialist,
      fetchDailySchedule,
      updateDailySchedule,
      fetchActivitiesLibrary,
      fetchCenterActivities,
      syncCenterActivities,
      fetchVisitPolicy,
      updateVisitPolicy
    ]
  );
}

export type { PanelFaqItem, AmenityLibraryItem };
