import * as React from "react";
import {
  applyPanelTheme,
  readStoredPanelTheme,
  togglePanelTheme,
  type PanelTheme
} from "@/lib/panelTheme";
import styles from "./PanelDarkModeSwitch.module.css";

type Props = {
  className?: string;
};

export default function PanelDarkModeSwitch({ className }: Props) {
  const [theme, setTheme] = React.useState<PanelTheme>("light");
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const stored = readStoredPanelTheme();
    applyPanelTheme(stored);
    setTheme(stored);
    setReady(true);
  }, []);

  const on = theme === "dark";

  return (
    <div className={[styles.themeSwitch, className].filter(Boolean).join(" ")}>
      <span className={styles.label} aria-hidden="true">
        {on ? "دارک" : "روشن"}
      </span>
      <button
        type="button"
        className={styles.switch}
        role="switch"
        aria-checked={on}
        aria-label={on ? "غیرفعال کردن حالت تاریک" : "فعال کردن حالت تاریک"}
        data-on={on ? "true" : "false"}
        disabled={!ready}
        onClick={() => setTheme(current => togglePanelTheme(current))}
      >
        <span className={styles.knob} aria-hidden="true">
          {on ? "☾" : "☀"}
        </span>
      </button>
    </div>
  );
}
