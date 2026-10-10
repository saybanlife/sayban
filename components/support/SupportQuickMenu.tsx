import * as React from "react";
import { useRouter } from "next/router";
import { classNames, hasVariant } from "@plasmicapp/react-web";
import { Dialog, DialogContent, DialogTitle } from "@plasmicpkgs/radix-ui";
import { _useGlobalVariants } from "../plasmic/sayban/plasmic";
import { _useStyleTokens } from "../plasmic/sayban/PlasmicStyleTokensProvider";
import filterSty from "../plasmic/sayban/PlasmicFilter.module.css";
import Icon97Icon from "../plasmic/sayban/icons/PlasmicIcon__Icon97";
import Icon27Icon from "../plasmic/sayban/icons/PlasmicIcon__Icon27";
import ChevronLeftIcon from "../plasmic/sayban/icons/PlasmicIcon__ChevronLeft";
import { SUPPORT_PHONE } from "./supportTypes";
import styles from "./SupportQuickMenu.module.css";

export type SupportQuickMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageBase: string;
};

type MenuRowProps = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
};

function MenuRow({ label, icon, onClick }: MenuRowProps) {
  return (
    <button type="button" className={styles.row} onClick={onClick}>
      <span className={styles.rowIcon} aria-hidden>
        {icon}
      </span>
      <span className={styles.rowLabel}>{label}</span>
      <ChevronLeftIcon className={styles.rowChevron} role="img" />
    </button>
  );
}

export default function SupportQuickMenu({
  open,
  onOpenChange,
  pageBase
}: SupportQuickMenuProps) {
  const router = useRouter();
  const globalVariants = _useGlobalVariants();
  const styleTokensClassNames = _useStyleTokens();
  const isMobile = hasVariant(globalVariants, "screen", "mobileOnly");

  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  const navigate = React.useCallback(
    (path: string) => {
      close();
      router.push(path);
    },
    [close, router]
  );

  return (
    <Dialog
      className={classNames(
        "__wab_instance",
        "root_reset_qARqpE4p5tZmJuNxFbTaPz",
        "plasmic_default_styles",
        "plasmic_mixins",
        styleTokensClassNames,
        filterSty.dialog3
      )}
      open={open}
      onOpenChange={onOpenChange}
      overlayClassName={classNames({
        [filterSty["pcls_q2T0XKdiWi8t"]]: true,
        [filterSty["pcls_vBH8saG-EOIi"]]: isMobile
      })}
      themeResetClass={classNames(
        "root_reset_qARqpE4p5tZmJuNxFbTaPz",
        "plasmic_default_styles",
        "plasmic_mixins",
        styleTokensClassNames
      )}
      triggerSlot={<span className={styles.hiddenTrigger} aria-hidden />}
    >
      <DialogContent
        className={classNames("__wab_instance", filterSty.dialogContent)}
        enterAnimations={
          isMobile ? ["slide-in-from-bottom"] : ["zoom-enter", "fade-in"]
        }
        enterDuration={0.35}
        exitAnimations={
          isMobile ? ["slide-out-to-bottom"] : ["zoom-exit", "fade-out"]
        }
        exitDuration={0.3}
        themeResetClass={classNames(
          "root_reset_qARqpE4p5tZmJuNxFbTaPz",
          "plasmic_default_styles",
          "plasmic_mixins",
          styleTokensClassNames
        )}
      >
        <DialogTitle className={classNames("__wab_instance", filterSty.dialogTitle)}>
          <div className={styles.header}>
            <h2 className={styles.title}>پشتیبانی</h2>
            <p className={styles.subtitle}>
              هر سوالی داری، از ما بپرس؛ ما اینجاییم که کمکت کنیم.
            </p>
          </div>
        </DialogTitle>

        <div className={styles.sheet}>
          <div className={styles.card}>
            <MenuRow
              label="سوالات متداول"
              icon={<Icon97Icon className={styles.rowIcon} role="img" />}
              onClick={() => navigate(`/${pageBase}/FAQ`)}
            />
            <MenuRow
              label="پشتیبانی آنلاین"
              icon={<Icon27Icon className={styles.rowIcon} role="img" />}
              onClick={() => navigate(`/${pageBase}/support`)}
            />
            <MenuRow
              label="تماس"
              icon={
                <svg
                  className={styles.rowIcon}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V21a1 1 0 01-1 1C10.07 22 2 13.93 2 3a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.25 1.01l-2.2 2.2z" />
                </svg>
              }
              onClick={() => {
                close();
                window.location.href = `tel:${SUPPORT_PHONE}`;
              }}
            />
          </div>

          <button type="button" className={styles.cancel} onClick={close}>
            انصراف
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
