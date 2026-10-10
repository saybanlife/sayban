import * as React from "react";
import { useRouter } from "next/router";
import {
  PlasmicLogin,
  DefaultLoginProps
} from "./plasmic/sayban/PlasmicLogin";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import {
  PUBLIC_AUTH_COOKIE_NAME,
  isPublicAuthTokenValid,
  resolvePublicAuthToken
} from "@/lib/publicAuthToken";
import {
  clearGuestSession,
  consumeAuthReturn,
  GUEST_MODE_ENABLED,
  hasGuestSession,
  peekAuthReturn,
  readGuestSession
} from "@/lib/guestSession";
import { clearInvalidPublicAuth } from "@/lib/publicAuthGate";
import {
  createDefaultGuestSession,
  decodePublicUserId,
  DEFAULT_GUEST_NAME,
  finalizeGuestPhoneUpgrade
} from "@/lib/guestAccount";
import { isSaybanNativeAndroid } from "@/lib/nativeShell";
import styles from "./Login.module.css";

/**
 * Public entry:
 * - bare `/login` → `/login/mobile` while guest mode is off
 * - when guest mode is on: outside app auto-guest; native → mobile OTP
 * - `/login/mobile|code|name` is the existing Plasmic OTP / profile flow
 */
export interface LoginProps extends DefaultLoginProps {}

type LoginStep = "mobile" | "code" | "name" | "loading";

type GuestUpgradeSnapshot = {
  token: string;
  id: number | null;
  name: string;
};

function readTokenCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie
    .split(";")
    .map(part => part.trim())
    .find(part => part.startsWith(`${PUBLIC_AUTH_COOKIE_NAME}=`));
  if (!match) return "";
  return decodeURIComponent(match.slice(PUBLIC_AUTH_COOKIE_NAME.length + 1));
}

function resolveLoginStep(
  stepParam: string | string[] | undefined,
  asPath: string
): LoginStep | undefined {
  const fromQuery = Array.isArray(stepParam) ? stepParam[0] : stepParam;
  const known = (value: string | undefined): value is LoginStep =>
    value === "mobile" ||
    value === "code" ||
    value === "name" ||
    value === "loading";
  if (known(fromQuery)) return fromQuery;
  const parts = String(asPath || "")
    .split(/[?#]/)[0]
    .split("/")
    .filter(Boolean);
  const fromPath = parts[0] === "login" ? parts[1] : undefined;
  return known(fromPath) ? fromPath : undefined;
}

function Login_(props: LoginProps, ref: HTMLElementRefOf<"div">) {
  const router = useRouter();
  const page = resolveLoginStep(
    router.query.step as string | string[] | undefined,
    router.asPath
  );
  const otpFlowRef = React.useRef(false);
  const guestUpgradeRef = React.useRef<GuestUpgradeSnapshot | null>(null);
  const autoGuestStartedRef = React.useRef(false);
  const guestNameAutoDoneRef = React.useRef(false);
  const [bootError, setBootError] = React.useState("");

  React.useEffect(() => {
    if (page === "mobile" || page === "code" || page === "name") {
      otpFlowRef.current = true;
      if (hasGuestSession() && !guestUpgradeRef.current) {
        const token = readTokenCookie();
        guestUpgradeRef.current = {
          token,
          id: decodePublicUserId(token),
          name: readGuestSession()?.name || DEFAULT_GUEST_NAME
        };
      }
    }
  }, [page]);

  React.useEffect(() => {
    if (!router.isReady || page) return;
    const path = router.asPath.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
    if (path !== "/login") return;
    const raw = readTokenCookie();
    // Valid JWT + stale guest marker (OTP via Plasmic never cleared LS): keep JWT.
    if (isPublicAuthTokenValid(raw)) {
      if (hasGuestSession() && !GUEST_MODE_ENABLED) {
        clearGuestSession();
      }
      void router.replace(consumeAuthReturn() || "/home");
      return;
    }
    // Guest-only leftover while guest mode is off → drop marker (no JWT left).
    if (hasGuestSession() && !GUEST_MODE_ENABLED) {
      clearGuestSession();
    } else {
      clearInvalidPublicAuth();
    }

    // Guest temporarily disabled (or native): always mobile OTP — no auto-guest.
    if (!GUEST_MODE_ENABLED || isSaybanNativeAndroid()) {
      void router.replace("/login/mobile");
      return;
    }

    // Outside app with guest mode on: auto-create default guest.
    if (autoGuestStartedRef.current) return;
    autoGuestStartedRef.current = true;
    setBootError("");
    void (async () => {
      const result = await createDefaultGuestSession();
      if (!result.ok) {
        autoGuestStartedRef.current = false;
        setBootError(result.message);
        return;
      }
      const dest = consumeAuthReturn() || "/home";
      await router.replace(dest);
    })();
  }, [page, router]);

  React.useEffect(() => {
    if (!router.isReady) return;
    const onComplete = (url: string) => {
      if (url.startsWith("/login")) return;
      const token = resolvePublicAuthToken(readTokenCookie());
      if (!isPublicAuthTokenValid(token)) return;
      if (otpFlowRef.current) {
        const snapshot = guestUpgradeRef.current;
        otpFlowRef.current = false;
        guestUpgradeRef.current = null;
        if (snapshot?.token) {
          const newId = decodePublicUserId(token);
          void finalizeGuestPhoneUpgrade({
            guestToken: snapshot.token,
            guestId: snapshot.id,
            guestName: snapshot.name,
            authToken: token,
            authUserId: newId ?? snapshot.id ?? 0,
            linkGuestName: false
          }).catch(() => {
            clearGuestSession();
          });
        } else {
          clearGuestSession();
        }
      }
      const dest = peekAuthReturn();
      if (!dest) return;
      consumeAuthReturn();
      const here = url.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
      const there = dest.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
      if (here !== there) void router.replace(dest);
    };
    router.events.on("routeChangeComplete", onComplete);
    return () => {
      router.events.off("routeChangeComplete", onComplete);
    };
  }, [router]);

  // Guest upgrade via OTP install → skip name UI; apply default/guest name.
  React.useEffect(() => {
    if (!router.isReady || page !== "name") return;
    if (!hasGuestSession() && !guestUpgradeRef.current) return;
    if (guestNameAutoDoneRef.current) return;
    guestNameAutoDoneRef.current = true;
    const snapshot =
      guestUpgradeRef.current ||
      ({
        token: "",
        id: null,
        name: readGuestSession()?.name || DEFAULT_GUEST_NAME
      } as GuestUpgradeSnapshot);
    const authToken = readTokenCookie();
    const authUserId = decodePublicUserId(authToken);
    if (!authToken || authUserId == null) {
      guestNameAutoDoneRef.current = false;
      return;
    }
    void (async () => {
      try {
        await finalizeGuestPhoneUpgrade({
          guestToken: snapshot.token || authToken,
          guestId: snapshot.id,
          guestName: snapshot.name || DEFAULT_GUEST_NAME,
          authToken,
          authUserId,
          linkGuestName: true
        });
        otpFlowRef.current = false;
        guestUpgradeRef.current = null;
        const dest = consumeAuthReturn() || "/home";
        await router.replace(dest);
      } catch {
        guestNameAutoDoneRef.current = false;
        setBootError("اتصال حساب مهمان ناموفق بود. دوباره تلاش کنید.");
      }
    })();
  }, [page, router]);

  if (!page) {
    if (!router.isReady) return <div className={styles.signupSlim} />;
    if (isPublicAuthTokenValid(readTokenCookie())) {
      return <div className={styles.signupSlim} />;
    }
    return (
      <div className={styles.signupSlim} dir="rtl">
        {bootError ? (
          <p style={{ textAlign: "center", padding: 24 }}>{bootError}</p>
        ) : null}
      </div>
    );
  }

  if (page === "name" && (hasGuestSession() || guestUpgradeRef.current)) {
    return (
      <div className={styles.signupSlim} dir="rtl">
        {bootError ? (
          <p style={{ textAlign: "center", padding: 24 }}>{bootError}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.signupSlim}>
      <PlasmicLogin
        root={{ ref }}
        {...props}
        page={page}
        sideEffect={{ onMount: async () => undefined }}
      />
    </div>
  );
}

const Login = React.forwardRef(Login_);
export default Login;
