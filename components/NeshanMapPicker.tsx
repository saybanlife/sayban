import * as React from "react";
import styles from "./NeshanMapPicker.module.css";

const NESHAN_WEB_KEY = "web.ec9b9fb4e25047269e526203a883d463";
const NESHAN_SERVICE_KEY = "service.a0319015d66645799e1ed0986dd18773";
const NESHAN_SDK_CSS =
  "https://static.neshan.org/sdk/leaflet/v1.9.4/neshan-sdk/v1.0.8/index.css";
const NESHAN_SDK_JS =
  "https://static.neshan.org/sdk/leaflet/v1.9.4/neshan-sdk/v1.0.8/index.js";

const DEFAULT_CENTER: [number, number] = [35.6892, 51.389];

type NeshanLocation = {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  state?: string;
};

export type NeshanMapPickerProps = {
  className?: string;
  initialLat?: number | string;
  initialLng?: number | string;
  labeledLocate?: boolean;
  onLocationChange?: (location: NeshanLocation) => void;
};

declare global {
  interface Window {
    L?: {
      Map: new (
        id: string,
        options: Record<string, unknown>
      ) => NeshanLeafletMap;
      divIcon: (options: Record<string, unknown>) => unknown;
      marker: (
        latlng: [number, number],
        options: Record<string, unknown>
      ) => NeshanLeafletMarker;
      Control: {
        extend: (options: Record<string, unknown>) => new () => {
          onAdd: (map: NeshanLeafletMap) => HTMLElement;
        };
      };
      DomUtil: {
        create: (
          tag: string,
          className?: string,
          container?: HTMLElement
        ) => HTMLElement;
      };
      DomEvent: {
        on: (
          el: HTMLElement,
          event: string,
          handler: (event: Event) => void
        ) => void;
        stop: (event: Event) => void;
      };
    };
    goToLocation?: (
      lat: number | string,
      lng: number | string,
      zoom?: number
    ) => void;
    invalidateAddressMap?: () => void;
    locationIcon?: unknown;
  }
}

type NeshanLeafletMap = {
  setView: (latlng: [number, number], zoom: number) => void;
  flyTo: (latlng: [number, number], zoom: number) => void;
  on: (event: string, handler: (event: { latlng: { lat: number; lng: number } }) => void) => void;
  invalidateSize: () => void;
  addControl: (control: { onAdd: (map: NeshanLeafletMap) => HTMLElement }) => void;
  zoomIn: () => void;
  zoomOut: () => void;
};

type NeshanLeafletMarker = {
  addTo: (map: NeshanLeafletMap) => NeshanLeafletMarker;
  setLatLng: (latlng: [number, number]) => void;
};

let sdkLoadPromise: Promise<void> | null = null;

function loadNeshanSdk(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window.L) {
    return Promise.resolve();
  }
  if (sdkLoadPromise) {
    return sdkLoadPromise;
  }

  sdkLoadPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${NESHAN_SDK_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = NESHAN_SDK_CSS;
      document.head.appendChild(link);
    }

    const existingScript = document.querySelector(
      `script[src="${NESHAN_SDK_JS}"]`
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Neshan SDK failed to load")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = NESHAN_SDK_JS;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Neshan SDK failed to load"));
    document.body.appendChild(script);
  });

  return sdkLoadPromise;
}

async function reverseGeocode(lat: number, lng: number) {
  const url = `https://api.neshan.org/v5/reverse?lat=${lat}&lng=${lng}&format=json`;
  const response = await fetch(url, {
    headers: {
      "Api-Key": NESHAN_SERVICE_KEY,
      "Accept-Language": "fa"
    }
  });
  if (!response.ok) return null;
  const data = await response.json();
  if (data?.status !== "OK") return null;
  return {
    address: data.formatted_address as string | undefined,
    city: ((data.city as string) || "").replace(/^شهر\s*/, ""),
    state: ((data.state as string) || "").replace("استان", "")
  };
}

function NeshanMapPicker({
  className,
  initialLat,
  initialLng,
  labeledLocate,
  onLocationChange
}: NeshanMapPickerProps) {
  const mapContainerId = React.useId().replace(/:/g, "");
  const mapRef = React.useRef<NeshanLeafletMap | null>(null);
  const markerRef = React.useRef<NeshanLeafletMarker | null>(null);
  const onLocationChangeRef = React.useRef(onLocationChange);
  const labeledLocateRef = React.useRef(labeledLocate);
  const initialCenterRef = React.useRef({ lat: initialLat, lng: initialLng });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  onLocationChangeRef.current = onLocationChange;
  labeledLocateRef.current = labeledLocate;

  const setMarker = React.useCallback((lat: number, lng: number) => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L) return;

    if (!window.locationIcon) {
      window.locationIcon = L.divIcon({
        className: "",
        html: `<svg width="32" height="32" viewBox="0 0 24 24" fill="#e53935"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });
    }

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], {
        icon: window.locationIcon
      }).addTo(map);
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
  }, []);

  const emitLocation = React.useCallback(async (lat: number, lng: number) => {
    setMarker(lat, lng);
    const geocoded = await reverseGeocode(lat, lng);
    onLocationChangeRef.current?.({
      lat,
      lng,
      address: geocoded?.address,
      city: geocoded?.city,
      state: geocoded?.state
    });
  }, [setMarker]);

  React.useEffect(() => {
    let cancelled = false;
    let observer: IntersectionObserver | null = null;

    const init = async () => {
      try {
        await loadNeshanSdk();
        if (cancelled || !window.L) return;

        const L = window.L;
        const map = new L.Map(mapContainerId, {
          key: NESHAN_WEB_KEY,
          maptype: "dreamy",
          poi: true,
          traffic: false,
          zoomControl: false
        });

        mapRef.current = map;

        const lat = initialCenterRef.current.lat
          ? parseFloat(String(initialCenterRef.current.lat))
          : DEFAULT_CENTER[0];
        const lng = initialCenterRef.current.lng
          ? parseFloat(String(initialCenterRef.current.lng))
          : DEFAULT_CENTER[1];
        const center: [number, number] = [
          Number.isFinite(lat) ? lat : DEFAULT_CENTER[0],
          Number.isFinite(lng) ? lng : DEFAULT_CENTER[1]
        ];

        map.setView(center, 13);

        map.on("click", event => {
          const { lat: nextLat, lng: nextLng } = event.latlng;
          void emitLocation(nextLat, nextLng);
        });

        const LocationControl = L.Control.extend({
          options: { position: "bottomright" },
          onAdd() {
            const isLabeled = labeledLocateRef.current;
            const btn = L.DomUtil.create(
              "button",
              isLabeled ? "neshan-map-btn neshan-map-btn-labeled" : "neshan-map-btn"
            ) as HTMLButtonElement;
            btn.type = "button";
            btn.style.cssText = isLabeled
              ? "height:36px;padding:0 12px;background:#fff;border:none;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.18);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-family:inherit;color:#374151;"
              : "width:34px;height:34px;background:#fff;border:none;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;";
            const locateIcon =
              '<svg viewBox="0 0 24 24" width="18" fill="#545454"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>';
            btn.innerHTML = isLabeled
              ? `${locateIcon}<span>موقعیت من</span>`
              : locateIcon;
            L.DomEvent.on(btn, "click", event => {
              L.DomEvent.stop(event);
              if (!navigator.geolocation) return;
              navigator.geolocation.getCurrentPosition(pos => {
                void emitLocation(pos.coords.latitude, pos.coords.longitude);
                map.flyTo(
                  [pos.coords.latitude, pos.coords.longitude],
                  15
                );
              });
            });
            return btn;
          }
        });

        const ZoomControl = L.Control.extend({
          options: { position: "topleft" },
          onAdd(currentMap: NeshanLeafletMap) {
            const container = L.DomUtil.create("div");
            container.style.display = "flex";
            container.style.flexDirection = "column";
            container.style.gap = "8px";

            const zIn = L.DomUtil.create(
              "button",
              "neshan-map-btn",
              container
            ) as HTMLButtonElement;
            zIn.type = "button";
            zIn.textContent = "+";
            zIn.style.cssText =
              "width:34px;height:34px;background:#fff;border:none;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;";
            L.DomEvent.on(zIn, "click", event => {
              L.DomEvent.stop(event);
              currentMap.zoomIn();
            });

            const zOut = L.DomUtil.create(
              "button",
              "neshan-map-btn",
              container
            ) as HTMLButtonElement;
            zOut.type = "button";
            zOut.textContent = "−";
            zOut.style.cssText =
              "width:34px;height:34px;background:#fff;border:none;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;";
            L.DomEvent.on(zOut, "click", event => {
              L.DomEvent.stop(event);
              currentMap.zoomOut();
            });

            return container;
          }
        });

        map.addControl(new LocationControl());
        map.addControl(new ZoomControl());

        window.goToLocation = (nextLat, nextLng, zoom = 15) => {
          const parsedLat = parseFloat(String(nextLat));
          const parsedLng = parseFloat(String(nextLng));
          if (!mapRef.current || Number.isNaN(parsedLat) || Number.isNaN(parsedLng)) {
            return;
          }
          mapRef.current.flyTo([parsedLat, parsedLng], zoom);
          void emitLocation(parsedLat, parsedLng);
        };

        window.invalidateAddressMap = () => {
          mapRef.current?.invalidateSize();
        };

        window.setTimeout(() => {
          map.invalidateSize();
        }, 300);

        // Ant Design tabs keep inactive panels mounted with zero size —
        // invalidate when this map stage becomes visible again.
        const host = document.getElementById(mapContainerId)?.parentElement;
        if (host && typeof IntersectionObserver !== "undefined") {
          observer = new IntersectionObserver(
            entries => {
              if (entries.some(entry => entry.isIntersecting)) {
                window.setTimeout(() => map.invalidateSize(), 50);
              }
            },
            { threshold: 0.1 }
          );
          observer.observe(host);
        }

        if (!cancelled) {
          setLoading(false);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError("بارگذاری نقشه با خطا مواجه شد.");
          setLoading(false);
        }
      }
    };

    void init();

    return () => {
      cancelled = true;
      observer?.disconnect();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [emitLocation, mapContainerId]);

  return (
    <div className={`${styles.root} ${className ?? ""}`.trim()}>
      <div id={mapContainerId} className={styles.map} />
      {loading ? (
        <div className={styles.loading}>در حال بارگذاری نقشه...</div>
      ) : null}
      {error ? <div className={styles.loading}>{error}</div> : null}
    </div>
  );
}

export default NeshanMapPicker;
