"use client";

import React, { useState } from "react";
import { MapContainer as LeafletMapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// آیکون‌های پیش‌فرض Leaflet
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";

// رفع مشکل آیکون پیش‌فرض
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
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

export const MapPicker = ({
  latitude,
  longitude,
  zoom = 13,
  onChange,
  className,
  mapClassName,
}: MapPickerProps) => {
  const [position, setPosition] = useState<[number, number] | null>(
    latitude !== undefined && longitude !== undefined ? [latitude, longitude] : null
  );

  const handleSelect = (lat: number, lng: number) => {
    setPosition([lat, lng]);
    onChange?.(lat, lng);
  };

  return (
    <div className={`map-picker-wrapper ${className || ""}`}>
      <LeafletMapContainer
        center={position || [35.6892, 51.3890]} // Tehran
        zoom={zoom}
        className={`map-picker-map ${mapClassName || ""}`}
        style={{ width: "100%", height: "400px" }}
      >
        <TileLayer
          attribution='© OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} onSelect={handleSelect} />
      </LeafletMapContainer>
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
