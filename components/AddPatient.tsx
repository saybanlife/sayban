import * as React from "react";
import { useRouter } from "next/router";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import {
  PlasmicAddPatient,
  DefaultAddPatientProps
} from "./plasmic/sayban/PlasmicAddPatient";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import Loaction2 from "./Loaction2";
import LoactionUser from "./LoactionUser";
import styles from "./AddPatient.module.css";
import mapStyles from "./AddAddress.module.css";
import {
  clearEditPatient,
  readEditPatient,
  type CompanionRecord
} from "./user/patientAddressApi";

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

export interface AddPatientProps extends DefaultAddPatientProps {}

type AddressStep = 1 | 2;

type LocationSnapshot = {
  address: string;
  lat: string;
  lon: string;
  city2: string;
  details: string;
  postal_code: string;
};

type LocationFieldHandlers = {
  onAddressChange?: (value: string) => void;
  onAddressChange2?: (value: string) => void;
  onPostChange?: (value: string) => void;
  onLatChange?: (value: string) => void;
  onLonChange?: (value: string) => void;
  onCityChange?: (value: string) => void;
};

function isAddPatientPath(path?: string) {
  return Boolean(path && /addPatient/i.test(path));
}

function emptySnapshot(city = ""): LocationSnapshot {
  return {
    address: "",
    lat: "",
    lon: "",
    city2: city,
    details: "",
    postal_code: ""
  };
}

function snapshotFromRecord(
  record: CompanionRecord | null,
  fallbackCity = ""
): LocationSnapshot {
  if (!record) return emptySnapshot(fallbackCity);
  return {
    address: String(record.address || ""),
    lat: record.latitude != null ? String(record.latitude) : "",
    lon: record.longitude != null ? String(record.longitude) : "",
    city2: String(record.city || fallbackCity),
    details: String(record.details || ""),
    postal_code: String(record.postal_code || "")
  };
}

function AddPatient_(props: AddPatientProps, ref: HTMLElementRefOf<"div">) {
  const router = useRouter();
  const $globalActions = useGlobalActions();
  const editId = React.useMemo(() => {
    const raw = router.query.edit;
    const id = Number(Array.isArray(raw) ? raw[0] : raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }, [router.query.edit]);
  const editRecord = React.useMemo(
    () => (editId ? readEditPatient() : null),
    [editId]
  );
  const isEdit = Boolean(editId && editRecord?.id);

  const [addressStep, setAddressStep] = React.useState<AddressStep>(1);
  const addressStepRef = React.useRef<AddressStep>(1);
  const [addressEnabled, setAddressEnabled] = React.useState(
    () => isEdit && Boolean(editRecord?.address || editRecord?.latitude)
  );
  const locationSnapshot = React.useRef<LocationSnapshot>(
    snapshotFromRecord(isEdit ? editRecord : null)
  );
  const fieldHandlersRef = React.useRef<LocationFieldHandlers>({});
  const prefilledRef = React.useRef(false);

  const isActive = isAddPatientPath(router.asPath);

  const setAddressStepSafe = React.useCallback((next: AddressStep) => {
    addressStepRef.current = next;
    setAddressStep(next);
  }, []);

  const showToast = React.useCallback(
    (type: "error" | "success", message: string) => {
      $globalActions?.["Fragment.showToast"]?.(type, message, "bottom-center");
    },
    [$globalActions]
  );

  const resetAddressBlock = React.useCallback(() => {
    locationSnapshot.current = emptySnapshot();
    setAddressStepSafe(1);
    const handlers = fieldHandlersRef.current;
    handlers.onAddressChange?.("");
    handlers.onAddressChange2?.("");
    handlers.onPostChange?.("");
    handlers.onLatChange?.("");
    handlers.onLonChange?.("");
    handlers.onCityChange?.("");
  }, [setAddressStepSafe]);

  /** Map click / «موقعیت من» already reverse-geocodes — advance without a second CTA. */
  const maybeAutoConfirmFromMap = React.useCallback(() => {
    if (addressStepRef.current !== 1) return;
    const { lat, lon, address } = locationSnapshot.current;
    if (lat && lon && String(address || "").trim()) {
      setAddressStepSafe(2);
    }
  }, [setAddressStepSafe]);

  const withAddressInBody = React.useCallback(
    async (onClick: ((...args: any[]) => any) | undefined) => {
      const api = $globalActions?.["Fragment.apiRequest"];
      if (typeof onClick !== "function" || typeof api !== "function") {
        await onClick?.({});
        return;
      }

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
      if (addressEnabled && addressStepRef.current === 2 && (!lat || !lon)) {
        showToast("error", "لطفاً موقعیت را روی نقشه انتخاب کنید.");
        return;
      }

      const wrapped = async (
        method: string,
        url: string,
        params: unknown,
        body: Record<string, unknown> | undefined,
        config: unknown
      ) => {
        const isAdd =
          method === "POST" && String(url).includes("add/patients");
        const isUpdate =
          method === "POST" && String(url).includes("update/patient");
        if ((isAdd || isUpdate) && body && typeof body === "object") {
          const addressFields = addressEnabled
            ? {
                city: snap.city2.trim() || null,
                address: snap.address.trim() || null,
                details: snap.details.trim() || null,
                postal_code: snap.postal_code.trim() || null,
                latitude: lat || null,
                longitude: lon || null
              }
            : {
                city: null,
                address: null,
                details: null,
                postal_code: null,
                latitude: null,
                longitude: null
              };

          if (isEdit && editId) {
            return api(
              "POST",
              "update/patient",
              params,
              { ...body, id: editId, ...addressFields },
              config
            );
          }
          return api(
            method,
            url,
            params,
            { ...body, ...addressFields },
            config
          );
        }
        return api(method, url, params, body, config);
      };

      const prev = $globalActions!["Fragment.apiRequest"];
      $globalActions!["Fragment.apiRequest"] = wrapped as typeof prev;
      try {
        await onClick({});
        if (isEdit) clearEditPatient();
      } finally {
        $globalActions!["Fragment.apiRequest"] = prev;
        if (!isEdit) {
          resetAddressBlock();
          setAddressEnabled(false);
        }
      }
    },
    [
      $globalActions,
      addressEnabled,
      editId,
      isEdit,
      resetAddressBlock,
      showToast
    ]
  );

  React.useEffect(() => {
    if (!isActive || prefilledRef.current || !isEdit || !editRecord) return;
    prefilledRef.current = true;
    queueMicrotask(() => {
      const snap = snapshotFromRecord(editRecord);
      locationSnapshot.current = snap;
      const handlers = fieldHandlersRef.current;
      handlers.onAddressChange?.(snap.address);
      handlers.onAddressChange2?.(snap.details);
      handlers.onPostChange?.(snap.postal_code);
      handlers.onLatChange?.(snap.lat);
      handlers.onLonChange?.(snap.lon);
      handlers.onCityChange?.(snap.city2);
      if (snap.lat && snap.lon) {
        window.goToLocation?.(snap.lat, snap.lon, 16);
        setAddressStepSafe(2);
      }
    });
  }, [isActive, isEdit, editRecord, setAddressStepSafe]);

  React.useEffect(() => {
    if (isActive) return;
    prefilledRef.current = false;
    clearEditPatient();
  }, [isActive]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (addressEnabled) window.invalidateAddressMap?.();
    }, 280);
    return () => window.clearTimeout(timer);
  }, [addressEnabled, addressStep]);

  return (
    <PlasmicAddPatient
      root={{ ref }}
      {...props}
      overrides={{
        header: {
          props: {
            slot: isEdit ? "ویرایش همراه" : "افزودن همراه"
          }
        },
        name: isEdit
          ? {
              render: (renderProps, DefaultName) => (
                <DefaultName {...renderProps} value={editRecord?.name ?? ""} />
              )
            }
          : undefined,
        code: isEdit
          ? {
              render: (renderProps, DefaultCode) => (
                <DefaultCode
                  {...renderProps}
                  value={editRecord?.national_code ?? ""}
                />
              )
            }
          : undefined,
        mobile: isEdit
          ? {
              render: (renderProps, DefaultMobile) => (
                <DefaultMobile
                  {...renderProps}
                  value={editRecord?.mobile ?? ""}
                />
              )
            }
          : undefined,
        selectGender: isEdit
          ? {
              render: (renderProps, DefaultSelect) => (
                <DefaultSelect
                  {...renderProps}
                  value={editRecord?.gender ?? undefined}
                />
              )
            }
          : undefined,
        selectMarital: isEdit
          ? {
              render: (renderProps, DefaultSelect) => (
                <DefaultSelect
                  {...renderProps}
                  value={editRecord?.marital_status ?? undefined}
                />
              )
            }
          : undefined,
        relation: {
          render: (renderProps, DefaultRelation) => (
            <>
              <DefaultRelation
                {...renderProps}
                {...(isEdit
                  ? { value: editRecord?.relation ?? undefined }
                  : {})}
              />
              <div className={styles.addressBlock}>
                <div className={styles.addressHeaderRow}>
                  <div className={styles.addressTitle}>آدرس (اختیاری)</div>
                  <label className={styles.addressToggle}>
                    <input
                      checked={addressEnabled}
                      type="checkbox"
                      onChange={event => {
                        const next = event.target.checked;
                        setAddressEnabled(next);
                        if (!next) resetAddressBlock();
                      }}
                    />
                    <span>افزودن آدرس</span>
                  </label>
                </div>

                {addressEnabled ? (
                  <div
                    className={`${mapStyles.stepContainer} ${mapStyles.embedded} ${
                      addressStep === 1
                        ? mapStyles.pageStep1
                        : mapStyles.pageStep2
                    }`}
                  >
                    <div className={mapStyles.mapStage}>
                      <LoactionUser
                        mapOnly
                        mapClassName={mapStyles.stepMap}
                        address={locationSnapshot.current.address}
                        city2={locationSnapshot.current.city2}
                        initialLat={locationSnapshot.current.lat}
                        initialLng={locationSnapshot.current.lon}
                        labeledLocate
                        onAddressChange={value => {
                          locationSnapshot.current.address = value;
                          fieldHandlersRef.current.onAddressChange?.(value);
                          maybeAutoConfirmFromMap();
                        }}
                        onCityChange={value => {
                          locationSnapshot.current.city2 = value;
                          fieldHandlersRef.current.onCityChange?.(value);
                        }}
                        onLatChange={value => {
                          locationSnapshot.current.lat = value ?? "";
                          fieldHandlersRef.current.onLatChange?.(value);
                          maybeAutoConfirmFromMap();
                        }}
                        onLonChange={value => {
                          locationSnapshot.current.lon = value ?? "";
                          fieldHandlersRef.current.onLonChange?.(value);
                          maybeAutoConfirmFromMap();
                        }}
                      />
                      {addressStep === 2 ? (
                        <button
                          type="button"
                          className={mapStyles.editLocationBtn}
                          onClick={() => setAddressStepSafe(1)}
                        >
                          <svg
                            className={mapStyles.editLocationIcon}
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

                    <div className={mapStyles.formSheet}>
                      <Loaction2
                        address={locationSnapshot.current.address}
                        address2={locationSnapshot.current.details}
                        city2={locationSnapshot.current.city2}
                        className={styles.addressFields}
                        post={locationSnapshot.current.postal_code}
                        onAddressChange={value => {
                          locationSnapshot.current.address = value;
                          fieldHandlersRef.current.onAddressChange?.(value);
                        }}
                        onAddressChange2={value => {
                          locationSnapshot.current.details = value;
                          fieldHandlersRef.current.onAddressChange2?.(value);
                        }}
                        onCityChange={value => {
                          locationSnapshot.current.city2 = value;
                          fieldHandlersRef.current.onCityChange?.(value);
                        }}
                        onPostChange={value => {
                          locationSnapshot.current.postal_code = value ?? "";
                          fieldHandlersRef.current.onPostChange?.(value);
                        }}
                        onLatChange={value => {
                          locationSnapshot.current.lat = value ?? "";
                          fieldHandlersRef.current.onLatChange?.(value);
                        }}
                        onLonChange={value => {
                          locationSnapshot.current.lon = value ?? "";
                          fieldHandlersRef.current.onLonChange?.(value);
                        }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )
        },
        codeSubmit2: {
          render: (renderProps, DefaultSubmit) => (
            <DefaultSubmit
              {...renderProps}
              label={
                isEdit ? (
                  <div>ذخیره تغییرات</div>
                ) : (
                  renderProps.label
                )
              }
              onClick={() => withAddressInBody(renderProps.onClick)}
            />
          )
        }
      }}
    />
  );
}

const AddPatient = React.forwardRef(AddPatient_);
export default AddPatient;
