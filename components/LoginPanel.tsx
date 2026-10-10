import * as React from "react";
import {
  PlasmicLoginPanel,
  DefaultLoginPanelProps,
} from "./plasmic/sayban/PlasmicLoginPanel";
import loginStyles from "./plasmic/sayban/PlasmicLoginPanel.module.css";
import panelStyles from "./plasmic/sayban/PlasmicPanel.module.css";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import ForgotPassword from "./forgotPassword";
import styles from "./LoginPanel.module.css";

type AuthView = "login" | "create" | "forgot";

export interface LoginPanelProps extends DefaultLoginPanelProps {
  overrides?: Record<string, any>; // اضافه کردن این خط برای رفع خطا
}

/**
 * LoginPanel is `position: fixed` (viewport shell). Plasmic nests another
 * `position: fixed` column for brand+form, so tall register content cannot
 * grow document height and gets clipped. Keep the shell scrollable and make
 * the inner column relative so the full form stays reachable.
 */
function LoginPanel_(
  props: LoginPanelProps,
  ref: HTMLElementRefOf<"section">
) {
  const { page: pageProp, overrides: overridesProp, ...restProps } = props;
  const [authView, setAuthView] = React.useState<AuthView>("login");

  React.useEffect(() => {
    if (pageProp === "login" || pageProp === "create") {
      setAuthView(pageProp);
    }
  }, [pageProp]);

  const showForgotPassword = authView === "forgot";
  const panelPage = authView === "create" ? "create" : "login";

  const goToLogin = React.useCallback(() => {
    setAuthView("login");
  }, []);

  const goToForgotPassword = React.useCallback(() => {
    setAuthView("forgot");
  }, []);

  const scrollFixCss = React.useMemo(
    () => `
.${panelStyles.loginPanel},
.${styles.host} {
  overflow-x: hidden !important;
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
.${styles.host} .${loginStyles.freeBox__rltR7} {
  height: auto !important;
  min-height: 100%;
  min-height: 100dvh;
  align-items: stretch !important;
  box-sizing: border-box;
}
.${styles.host} .${loginStyles.freeBox___1MiY2} {
  position: relative !important;
  left: auto !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  width: 100% !important;
  min-height: 100%;
  min-height: 100dvh;
  box-sizing: border-box;
  justify-content: center;
  overflow: visible !important;
  z-index: 1;
}
.${styles.host} .${loginStyles.section} {
  width: 100%;
  padding-bottom: calc(2rem + env(safe-area-inset-bottom, 0px));
}
.${styles.host} .${loginStyles.img__mo6Uf} {
  position: absolute !important;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
  min-height: 100%;
  object-fit: cover;
  pointer-events: none;
  z-index: 0;
}
`,
    []
  );

  const mergedOverrides = React.useMemo(
    () => ({
      ...overridesProp,
      loginLogin: {
        ...overridesProp?.loginLogin,
        ...(showForgotPassword ? { style: { display: "none" } } : {}),
        button2: {
          ...overridesProp?.loginLogin?.button2,
          onClick: (event: React.MouseEvent) => {
            overridesProp?.loginLogin?.button2?.onClick?.(event);
            goToForgotPassword();
          },
        },
      },
      createAccont: {
        ...overridesProp?.createAccont,
        // Keep CreateAccont mounted only on /panel/create. Soft-nav to login
        // used to leave step-2 («اطلاعات مرکز») visible because CSS hide
        // targets `.createAccont.__wab_instance`, which step-2 does not keep.
        wrap: (node: React.ReactNode) =>
          panelPage === "create" && !showForgotPassword ? node : null
      },
      reveal: {
        ...overridesProp?.reveal,
        render: (
          revealProps: React.ComponentProps<"div">,
          RevealComponent: React.ComponentType<any>
        ) => (
          <>
            <RevealComponent {...revealProps} />
            {showForgotPassword && (
              <ForgotPassword onBackToLogin={goToLogin} />
            )}
          </>
        ),
      },
    }),
    [overridesProp, showForgotPassword, goToForgotPassword, goToLogin, panelPage]
  );

  return (
    <>
      <style>{scrollFixCss}</style>
      <PlasmicLoginPanel
        key={panelPage}
        root={{ ref, className: styles.host }}
        {...restProps}
        page={panelPage}
        overrides={mergedOverrides}
      />
    </>
  );
}

const LoginPanel = React.forwardRef(LoginPanel_);
export default LoginPanel;
