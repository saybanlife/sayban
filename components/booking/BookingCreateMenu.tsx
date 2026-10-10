import * as React from "react";
import { useRouter } from "next/router";
import { classNames, hasVariant } from "@plasmicapp/react-web";
import { Dialog, DialogContent, DialogTitle } from "@plasmicpkgs/radix-ui";
import { _useGlobalVariants } from "../plasmic/sayban/plasmic";
import { _useStyleTokens } from "../plasmic/sayban/PlasmicStyleTokensProvider";
import filterStyles from "../plasmic/sayban/PlasmicFilter.module.css";
import PlasmicIcon__Bell from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__Bell";
import PlasmicIcon__ChevronLeft from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__ChevronLeft";
import PlasmicIcon__MapPin from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__MapPin";
import PlasmicIcon__User from "../plasmic/library_tabler_3_2_icons/icons/PlasmicIcon__User";
import { BOOKING_CREATE_ROUTES, type BookingCreateRoute } from "./bookingCreateRoutes";
import styles from "./BookingCreateMenu.module.css";

type IconTone = "green" | "sand";

type MenuOptionProps = {
  title: string;
  description: string;
  icon: React.ReactNode;
  tone: IconTone;
  onClick: () => void;
};

function MenuOption({ title, description, icon, tone, onClick }: MenuOptionProps) {
  return (
    <button type="button" className={styles.option} onClick={onClick}>
      <span
        className={classNames(
          styles.optionIcon,
          tone === "sand" ? styles.optionIconSand : styles.optionIconGreen
        )}
        aria-hidden
      >
        {icon}
      </span>
      <span className={styles.optionCopy}>
        <span className={styles.optionTitle}>{title}</span>
        <span className={styles.optionDescription}>{description}</span>
      </span>
      <PlasmicIcon__ChevronLeft className={styles.chevron} aria-hidden />
    </button>
  );
}

function ToggleIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function BookingCreateMenu() {
  const router = useRouter();
  const globalVariants = _useGlobalVariants();
  const styleTokensClassNames = _useStyleTokens();
  const isMobile = hasVariant(globalVariants, "screen", "mobileOnly");
  const [open, setOpen] = React.useState(false);

  const navigate = React.useCallback(
    (route: BookingCreateRoute) => {
      setOpen(false);
      void router.push(route);
    },
    [router]
  );

  return (
    <>
      {!open ? (
        <button
          type="button"
          className={styles.fab}
          aria-label="ثبت درخواست جدید"
          aria-haspopup="dialog"
          aria-expanded="false"
          onClick={() => setOpen(true)}
        >
          <ToggleIcon open={false} />
        </button>
      ) : null}

      <Dialog
        className={classNames(
          "__wab_instance",
          "root_reset_qARqpE4p5tZmJuNxFbTaPz",
          "plasmic_default_styles",
          "plasmic_mixins",
          styleTokensClassNames,
          filterStyles.dialog3
        )}
        open={open}
        onOpenChange={next => setOpen(Boolean(next))}
        overlayClassName={classNames(
          filterStyles["pcls_q2T0XKdiWi8t"],
          isMobile ? filterStyles["pcls_vBH8saG-EOIi"] : "",
          styles.overlay
        )}
        themeResetClass={classNames(
          "root_reset_qARqpE4p5tZmJuNxFbTaPz",
          "plasmic_default_styles",
          "plasmic_mixins",
          styleTokensClassNames
        )}
        triggerSlot={<span className={styles.hiddenTrigger} aria-hidden />}
      >
        <DialogContent
          className={classNames(
            "__wab_instance",
            filterStyles.dialogContent,
            styles.contentShell
          )}
          enterAnimations={[]}
          enterDuration={0}
          exitAnimations={[]}
          exitDuration={0}
          themeResetClass={classNames(
            "root_reset_qARqpE4p5tZmJuNxFbTaPz",
            "plasmic_default_styles",
            "plasmic_mixins",
            styleTokensClassNames
          )}
        >
          <div className={styles.panel} data-booking-create-menu="panel">
            <DialogTitle
              className={classNames("__wab_instance", filterStyles.dialogTitle)}
            >
              <h2 className={styles.title}>چه کاری می‌خواهید ثبت کنید؟</h2>
            </DialogTitle>

            <div className={styles.options} dir="rtl">
              <MenuOption
                title="درخواست مراقب یا پرستار"
                description="یک‌بار یا مداوم، در منزل یا بیمارستان"
                icon={<PlasmicIcon__User />}
                tone="green"
                onClick={() => navigate(BOOKING_CREATE_ROUTES.nurse)}
              />
              <MenuOption
                title="بازدید مراکز سالمندان"
                description="وقت بازدید از یک مرکز بگیرید"
                icon={<PlasmicIcon__MapPin />}
                tone="sand"
                onClick={() => navigate(BOOKING_CREATE_ROUTES.centerVisit)}
              />
              <MenuOption
                title="ثبت یادآوری دارو"
                description="ساعت مصرف دارو را یادآوری می‌کنیم"
                icon={<PlasmicIcon__Bell />}
                tone="green"
                onClick={() => navigate(BOOKING_CREATE_ROUTES.reminder)}
              />
            </div>
          </div>

          <button
            type="button"
            className={styles.closeFab}
            aria-label="بستن انتخاب درخواست"
            onClick={() => setOpen(false)}
          >
            <ToggleIcon open />
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}