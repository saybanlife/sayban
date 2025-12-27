import React, { useState } from "react";
import { classNames } from "@plasmicapp/react-web";
import { CodeComponentMeta } from "@plasmicapp/host";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";

// fix leaflet icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type MapPickerProps = {
  latitude?: number;
  longitude?: number;
  zoom?: number;

  onChange?: (lat: number, lng: number) => void;

  className?: string;
  mapClassName?: string;
};

const LocationMarker = ({
  position,
  onSelect,
}: {
  position: [number, number] | null;
  onSelect: (lat: number, lng: number) => void;
}) => {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return position ? <Marker position={position} /> : null;
};

export const MapPicker = (props: MapPickerProps) => {
  const {
    latitude,
    longitude,
    zoom = 13,
    onChange,
    className,
    mapClassName,
  } = props;

  const [position, setPosition] = useState<[number, number] | null>(
    latitude && longitude ? [latitude, longitude] : null
  );

  const handleSelect = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onChange?.(lat, lng);
  };

  return (
    <div className={classNames("map-picker-wrapper", className)}>
      <MapContainer
        center={position || [35.6892, 51.3890]} // Tehran
        zoom={zoom}
        className={classNames("map-picker-map", mapClassName)}
        style={{ width: "100%", height: "400px" }}
      >
        <TileLayer
          attribution="© OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} onSelect={handleSelect} />
      </MapContainer>
    </div>
  );
};
export const MapPickerMeta: CodeComponentMeta<MapPickerProps> = {
  name: "MapPicker",
  importPath: "@/components/MapPicker",
  props: {
    latitude: {
      type: "number",
      displayName: "Latitude",
    },
    longitude: {
      type: "number",
      displayName: "Longitude",
    },
    zoom: {
      type: "number",
      defaultValue: 13,
    },
    onChange: {
      type: "eventHandler",
      argTypes: [
        { name: "lat", type: "number" },
        { name: "lng", type: "number" },
      ],
    },
    className: {
      type: "class",
      displayName: "Wrapper Style",
    },
    mapClassName: {
      type: "class",
      displayName: "Map Style",
    },
  },
};
