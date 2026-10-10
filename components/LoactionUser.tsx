import * as React from "react";
import dynamic from "next/dynamic";
import {
  PlasmicLoactionUser,
  DefaultLoactionUserProps,
  type PlasmicLoactionUser__OverridesType
} from "./plasmic/sayban/PlasmicLoactionUser";
import { HTMLElementRefOf } from "@plasmicapp/react-web";

const NeshanMapPicker = dynamic(() => import("./NeshanMapPicker"), {
  ssr: false,
  loading: () => (
    <div style={{ padding: "24px", textAlign: "center", color: "#6b7280" }}>
      در حال بارگذاری نقشه...
    </div>
  )
});

export interface LoactionUserProps extends DefaultLoactionUserProps {
  overrides?: PlasmicLoactionUser__OverridesType;
  /** When true, renders only the interactive Neshan map (for address step 1). */
  mapOnly?: boolean;
  mapClassName?: string;
  initialLat?: number | string;
  initialLng?: number | string;
  labeledLocate?: boolean;
}

function LoactionUser_(props: LoactionUserProps, ref: HTMLElementRefOf<"div">) {
  const {
    mapOnly,
    mapClassName,
    className,
    onLatChange,
    onLonChange,
    onAddressChange,
    onCityChange,
    onStateChange,
    overrides,
    initialLat,
    initialLng,
    labeledLocate,
    ...rest
  } = props;

  if (mapOnly) {
    return (
      <div ref={ref} className={className} style={{ width: "100%", height: "100%" }}>
        <NeshanMapPicker
          className={mapClassName}
          initialLat={initialLat}
          initialLng={initialLng}
          labeledLocate={labeledLocate}
          onLocationChange={location => {
            onLatChange?.(String(location.lat));
            onLonChange?.(String(location.lng));
            if (location.address) {
              onAddressChange?.(location.address);
            }
            if (location.city) {
              onCityChange?.(location.city);
            }
            if (location.state) {
              onStateChange?.(location.state);
            }
          }}
        />
      </div>
    );
  }

  return (
    <PlasmicLoactionUser
      root={{ ref }}
      className={className}
      onLatChange={onLatChange}
      onLonChange={onLonChange}
      onAddressChange={onAddressChange}
      onCityChange={onCityChange}
      onStateChange={onStateChange}
      overrides={overrides}
      {...rest}
    />
  );
}

const LoactionUser = React.forwardRef(LoactionUser_);
export default LoactionUser;
