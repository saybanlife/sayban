import * as React from "react";
import { getGoogleMapsUrl, type MapLocationInput } from "./reservationMapLinks";
import styles from "./ShowOnMapButton.module.css";

type Props = {
  location?: MapLocationInput | null;
  className?: string;
  label?: string;
};

export default function ShowOnMapButton({
  location,
  className,
  label = "نمایش روی نقشه"
}: Props) {
  const href = React.useMemo(() => getGoogleMapsUrl(location), [location]);
  if (!href) return null;

  return (
    <a
      className={[styles.button, className].filter(Boolean).join(" ")}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
    >
      {label}
    </a>
  );
}
