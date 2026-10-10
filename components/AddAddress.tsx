import * as React from "react";
import {
  PlasmicAddAddress,
  DefaultAddAddressProps
} from "./plasmic/sayban/PlasmicAddAddress";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import { useRouter } from "next/router";
import LoactionUser from "./LoactionUser";
import styles from "./AddAddress.module.css";
import plasmicStyles from "./plasmic/sayban/PlasmicAddAddress.module.css";
import { clearEditAddress, readEditAddress } from "./user/patientAddressApi";
import { goBackOrReplace } from "./navigation/backNavigation";
import {
  clearAddressDialogReturn,
  readAddressDialogReturn,
  stripAddAddressSegment
} from "./address/addressDialogFlow";

declare global {
  interface Window {
    selLat?: number;
    selLng?: number;
    goToLocation?: (
      lat: number | string,
      lng: number | string,
      zoom?: number
    ) => void;
    invalidateAddressMap?: () => void;
  }
}

export interface AddAddressProps extends DefaultAddAddressProps {}

type AddressStep = 1 | 2;

type LocationSnapshot = {
  address: string;
  lat: string;
  lon: string;
  city2: string;
};

type LocationFieldHandlers = {
  onAddressChange?: (value: string) => void;
  onAddressChange2?: (value: string) => void;
  onTitleChange?: (value: string) => void;
  onPostChange?: (value: string) => void;
  onLatChange?: (value: string) => void;
  onLonChange?: (value: string) => void;
  onCityChange?: (value: string) => void;
};

const STEP_HISTORY_KEY = "saybanAddAddressStep";

function isAddAddressPath(path?: string) {
  return Boolean(path && /addAddress/i.test(path));
}

function emptySnapshot(city = ""): LocationSnapshot {
  return { address: "", lat: "", lon: "", city2: city };
}

function AddAddress_(props: AddAddressProps, ref: HTMLElementRefOf<"div">) {
  const $globalActions = useGlobalActions?.();
  const router = useRouter();
  const editId = React.useMemo(() => {
    const raw = router.query.edit;
    const id = Number(Array.isArray(raw) ? raw[0] : raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }, [router.query.edit]);
  const editRecord = React.useMemo(
    () => (editId ? readEditAddress() : null),
    [editId]
  );
  const isEdit = Boolean(editId && editRecord?.id);
  const [step, setStep] = React.useState<AddressStep>(isEdit ? 2 : 1);
  const stepRef = React.useRef<AddressStep>(1);
  const wasActiveRef = React.useRef(false);
  const pendingResetRef = React.useRef(false);
  const locationSnapshot = React.useRef<LocationSnapshot>(
    isEdit && editRecord
      ? {
          address: String(editRecord.address || ""),
          lat:
            editRecord.latitude != null ? String(editRecord.latitude) : "",
          lon:
            editRecord.longitude != null ? String(editRecord.longitude) : "",
          city2: String(editRecord.city || props.userCity || "")
        }
      : emptySnapshot(props.userCity ?? "")
  );
  const fieldHandlersRef = React.useRef<LocationFieldHandlers>({});
  const prefilledRef = React.useRef(false);

  const isActive = isAddAddressPath(router.asPath);

  const setStepSafe = React.useCallback((next: AddressStep) => {
    stepRef.current = next;
    setStep(next);
  }, []);

  const showToast = React.useCallback(
    (type: "error" | "success", message: string) => {
      $globalActions?.["Fragment.showToast"]?.(type, message, "bottom-center");
    },
    [$globalActions]
  );

  const resetForm = React.useCallback(
    (keepCity = true) => {
      const city = keepCity ? props.userCity ?? "" : "";
      locationSnapshot.current = emptySnapshot(city);
      const handlers = fieldHandlersRef.current;
      handlers.onAddressChange?.("");
      handlers.onAddressChange2?.("");
      handlers.onTitleChange?.("");
      handlers.onPostChange?.("");
      handlers.onLatChange?.("");
      handlers.onLonChange?.("");
      handlers.onCityChange?.(city);
    },
    [props.userCity]
  );

  const exitFlow = React.useCallback(() => {
    setStepSafe(1);
    resetForm();
    const remembered = readAddressDialogReturn();
    const pageBase =
      typeof router.query.page === "string" && router.query.page
        ? router.query.page
        : "home";
    const fallback = stripAddAddressSegment(router.asPath, pageBase);
    if (remembered?.path) {
      clearAddressDialogReturn();
      void router.replace(remembered.path.split(/[?#]/)[0] || fallback);
      return;
    }
    goBackOrReplace(router, fallback);
  }, [resetForm, router, setStepSafe]);

  const goToStep1 = React.useCallback(
    (useHistoryBack = false) => {
      // Only pop history when this flow pushed the step-2 entry. Edit mode
      // opens on step 2 without a push — history.back() would leave the page
      // and the «ویرایش موقعیت» control looked broken / missing.
      if (
        useHistoryBack &&
        stepRef.current === 2 &&
        typeof window !== "undefined" &&
        window.history.state?.[STEP_HISTORY_KEY] === 2
      ) {
        window.history.back();
        return;
      }
      setStepSafe(1);
    },
    [setStepSafe]
  );

  const handleConfirmStep1 = React.useCallback(() => {
    const { lat, lon, address, city2 } = locationSnapshot.current;
    if (!lat || !lon) {
      showToast("error", "لطفاً موقعیت خود را روی نقشه انتخاب کنید.");
      return;
    }
    if (!city2.trim() && !props.userCity?.trim()) {
      showToast("error", "لطفاً شهر را انتخاب کنید.");
      return;
    }
    if (!address.trim()) {
      showToast("error", "لطفاً آدرس را از روی نقشه انتخاب کنید.");
      return;
    }
    // Spread the current state so Next's `idx`/`__N` keys survive; replacing it
    // wholesale left this entry unroutable and broke `canGoBackWithinApp()`.
    window.history.pushState(
      { ...window.history.state, [STEP_HISTORY_KEY]: 2 },
      ""
    );
    setStepSafe(2);
  }, [props.userCity, setStepSafe, showToast]);

  const handleSubmitAddress = React.useCallback(
    async (renderProps: { onClick?: (...args: any[]) => any }) => {
      const snap = locationSnapshot.current;
      const lat =
        snap.lat ||
        (typeof window !== "undefined" && window.selLat != null
          ? String(window.selLat)
          : "");
      const lon =
        snap.lon ||
        (typeof window !== "undefined" && window.selLng != null
          ? String(window.selLng)
          : "");
      if (!lat || !lon) {
        showToast("error", "لطفاً موقعیت خود را روی نقشه انتخاب کنید.");
        return;
      }

      const original = renderProps.onClick;
      const api = $globalActions?.["Fragment.apiRequest"];
      if (typeof original !== "function" || typeof api !== "function") {
        showToast("error", "امکان ثبت آدرس وجود ندارد.");
        return;
      }

      const wrapped = async (
        method: string,
        url: string,
        params: unknown,
        body: Record<string, unknown> | undefined,
        config: unknown
      ) => {
        if (
          method === "POST" &&
          (String(url).includes("add/address") ||
            String(url).includes("update/address")) &&
          body &&
          typeof body === "object"
        ) {
          const targetUrl = isEdit ? "update/address" : String(url);
          const payload = isEdit
            ? { ...body, id: editId, latitude: lat, longitude: lon }
            : { ...body, latitude: lat, longitude: lon };
          const result = await api(
            "POST",
            targetUrl,
            params,
            payload,
            config
          );
          if (!isEdit) {
            try {
              const createdId = Number(
                (result as any)?.data?.data?.id ??
                  (result as any)?.data?.result?.id ??
                  (result as any)?.data?.id
              );
              if (createdId) {
                const { selectCurrentAddress } = await import(
                  "./home/currentAddressApi"
                );
                await selectCurrentAddress(createdId);
              }
            } catch {
              // non-blocking
            }
          }
          if (isEdit) clearEditAddress();
          return result;
        }
        return api(method, url, params, body, config);
      };

      const prev = $globalActions!["Fragment.apiRequest"];
      $globalActions!["Fragment.apiRequest"] = wrapped as typeof prev;
      try {
        await original({});
      } finally {
        $globalActions!["Fragment.apiRequest"] = prev;
      }
    },
    [$globalActions, editId, isEdit, showToast]
  );

  const handleHeaderBack = React.useCallback(() => {
    if (stepRef.current === 2) {
      goToStep1(true);
      return;
    }
    exitFlow();
  }, [exitFlow, goToStep1]);

  const handleAddNew = React.useCallback(() => {
    setStepSafe(1);
    resetForm();
    props.addNew?.();
  }, [props.addNew, resetForm, setStepSafe]);

  React.useEffect(() => {
    stepRef.current = step;
  }, [step]);

  React.useEffect(() => {
    locationSnapshot.current.city2 =
      props.loaction2City2 ?? props.userCity ?? locationSnapshot.current.city2;
  }, [props.loaction2City2, props.userCity]);

  React.useEffect(() => {
    if (!isActive || prefilledRef.current || !isEdit || !editRecord) return;
    prefilledRef.current = true;
    queueMicrotask(() => {
      const handlers = fieldHandlersRef.current;
      handlers.onAddressChange?.(String(editRecord.address || ""));
      handlers.onAddressChange2?.(String(editRecord.details || ""));
      handlers.onTitleChange?.(String(editRecord.title || ""));
      handlers.onPostChange?.(String(editRecord.postal_code || ""));
      handlers.onLatChange?.(
        editRecord.latitude != null ? String(editRecord.latitude) : ""
      );
      handlers.onLonChange?.(
        editRecord.longitude != null ? String(editRecord.longitude) : ""
      );
      handlers.onCityChange?.(
        String(editRecord.city || props.userCity || "")
      );
      if (editRecord.latitude && editRecord.longitude) {
        window.goToLocation?.(
          editRecord.latitude,
          editRecord.longitude,
          16
        );
      }
      setStepSafe(2);
    });
  }, [isActive, isEdit, editRecord, props.userCity, setStepSafe]);

  React.useEffect(() => {
    if (isActive) return;
    prefilledRef.current = false;
    clearEditAddress();
  }, [isActive]);

  React.useEffect(() => {
    const entered = isActive && !wasActiveRef.current;
    const left = !isActive && wasActiveRef.current;
    wasActiveRef.current = isActive;

    if (left) {
      setStepSafe(1);
      pendingResetRef.current = true;
      resetForm();
      return;
    }
    if (entered && !isEdit) {
      setStepSafe(1);
      pendingResetRef.current = true;
      resetForm();
    }
  }, [isActive, isEdit, resetForm, setStepSafe]);

  React.useEffect(() => {
    const onPopState = () => {
      if (!isAddAddressPath(window.location.pathname + window.location.search)) {
        return;
      }
      // A Back press that closes a picker dialog (city, etc.) lands on an entry
      // that still carries a modal hash. Dropping the step here as well would
      // consume one press for two actions and lose the map selection.
      if (window.location.hash.startsWith("#modal-")) {
        return;
      }
      if (stepRef.current === 2) {
        setStepSafe(1);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [setStepSafe]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      window.invalidateAddressMap?.();
      const hint = document.getElementById("click_location");
      if (hint && step === 2) {
        hint.textContent =
          "برای اطمینان آدرس را چک کرده و در صورت مغایرت آن را اصلاح کنید.";
      }
    }, 280);
    return () => window.clearTimeout(timer);
  }, [step]);

  return (
    <PlasmicAddAddress
      root={{ ref }}
      {...props}
      className={`${props.className ?? ""} ${styles.page} ${
        step === 1 ? styles.pageStep1 : styles.pageStep2
      }`.trim()}
      addNew={handleAddNew}
      overrides={{
        header: {
          render: (headerProps, DefaultHeader) => (
            <DefaultHeader
              {...headerProps}
              runCode
              back={handleHeaderBack}
              slot={
                isEdit
                  ? "ویرایش آدرس"
                  : step === 1
                    ? "انتخاب محله"
                    : "آدرس جدید"
              }
              slot2={
                step === 1 ? (
                  <p className={styles.step1Hint}>
                    برای مشاهده مناسب‌ترین پیشنهادها، ابتدا موقعیتتان را مشخص
                    کنید.
                  </p>
                ) : null
              }
            />
          )
        },
        freeBox: {
          props: {
            className: styles.confirmBar
          }
        },
        loaction2: {
          props: {
            loaction2: step === 1 ? ("loaction2" as const) : undefined
          },
          render: (renderProps, DefaultLoaction2) => {
            fieldHandlersRef.current = {
              onAddressChange: renderProps.onAddressChange,
              onAddressChange2: renderProps.onAddressChange2,
              onTitleChange: renderProps.onTitleChange,
              onPostChange: renderProps.onPostChange,
              onLatChange: renderProps.onLatChange,
              onLonChange: renderProps.onLonChange,
              onCityChange: renderProps.onCityChange
            };

            if (pendingResetRef.current) {
              pendingResetRef.current = false;
              queueMicrotask(() => resetForm());
            }

            const syncedProps = {
              ...renderProps,
              onAddressChange: (value: string) => {
                locationSnapshot.current.address = value;
                renderProps.onAddressChange?.(value);
              },
              onLatChange: (value: string) => {
                locationSnapshot.current.lat = value ?? "";
                renderProps.onLatChange?.(value);
              },
              onLonChange: (value: string) => {
                locationSnapshot.current.lon = value ?? "";
                renderProps.onLonChange?.(value);
              },
              onCityChange: (value: string) => {
                locationSnapshot.current.city2 = value;
                renderProps.onCityChange?.(value);
              }
            };

            return (
              <div className={styles.stepContainer}>
                <div className={styles.mapStage}>
                  <LoactionUser
                    mapOnly
                    mapClassName={styles.stepMap}
                    address={renderProps.address}
                    city2={renderProps.city2}
                    onAddressChange={syncedProps.onAddressChange}
                    onCityChange={syncedProps.onCityChange}
                    onLatChange={syncedProps.onLatChange}
                    onLonChange={syncedProps.onLonChange}
                    initialLat={locationSnapshot.current.lat}
                    initialLng={locationSnapshot.current.lon}
                    labeledLocate
                  />
                  {step === 2 ? (
                    <button
                      type="button"
                      className={styles.editLocationBtn}
                      onClick={() => goToStep1(true)}
                    >
                      <svg
                        className={styles.editLocationIcon}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      ویرایش موقعیت
                    </button>
                  ) : null}
                </div>

                <div className={styles.formSheet}>
                  <DefaultLoaction2
                    {...syncedProps}
                    loaction2={step === 1 ? ("loaction2" as const) : undefined}
                  />
                </div>
              </div>
            );
          }
        },
        button: {
          render: (renderProps, DefaultButton) => {
            if (step === 1) {
              return (
                <DefaultButton
                  {...renderProps}
                  label={<div className={plasmicStyles.text}>تأیید</div>}
                  onClick={handleConfirmStep1}
                />
              );
            }
            return (
              <DefaultButton
                {...renderProps}
                label={
                  isEdit ? (
                    <div className={plasmicStyles.text}>ذخیره تغییرات</div>
                  ) : (
                    renderProps.label
                  )
                }
                onClick={() => handleSubmitAddress(renderProps)}
              />
            );
          }
        }
      }}
    />
  );
}

const AddAddress = React.forwardRef(AddAddress_);
export default AddAddress;
