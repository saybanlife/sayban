/**
 * Replace @plasmicpkgs/antd5 AntdModal imports with the PlasmicModal bridge
 * in panel-related Plasmic components.
 *
 *   node scripts/replace-panel-antd-modal.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "components/plasmic/sayban");

const PANEL_FILES = [
  "PlasmicMain.tsx",
  "PlasmicDashbord.tsx",
  "PlasmicServicePage.tsx",
  "PlasmicCenterPage.tsx",
  "PlasmicEditUser.tsx",
  "PlasmicEditStaffs.tsx",
  "PlasmicMainPageStaffs.tsx",
  "PlasmicMainPageQuestion.tsx",
  "PlasmicReservationItem.tsx",
  "PlasmicReservationItemMini.tsx",
  "PlasmicTimeWeek.tsx",
  "PlasmicCenterInfo.tsx",
  "PlasmicProfilePage.tsx"
];

const FROM =
  'import { AntdModal } from "@plasmicpkgs/antd5/skinny/registerModal";';
const TO = 'import { AntdModal } from "../../AntdModal";';

let changed = 0;
for (const name of PANEL_FILES) {
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) {
    console.warn("missing", name);
    continue;
  }
  const src = fs.readFileSync(file, "utf8");
  if (!src.includes(FROM)) {
    if (src.includes("AntdModal")) {
      console.warn("AntdModal present but import mismatch:", name);
    } else {
      console.log("skip (no AntdModal):", name);
    }
    continue;
  }
  fs.writeFileSync(file, src.replace(FROM, TO), "utf8");
  changed += 1;
  console.log("updated", name);
}
console.log(`done: ${changed} files`);
