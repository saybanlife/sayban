import * as React from "react";
import Dialog from "../Dialog";
import Button from "../Button";
import TextInput from "../TextInput";
import { readCookie } from "@/lib/authCookies";
import { resolveApiUrl } from "@/lib/apiRoutes";
import { getPhoneError } from "../formFieldRules";
import { readGuestSession } from "@/lib/guestSession";
import { PUBLIC_AUTH_COOKIE_NAME } from "@/lib/publicAuthToken";
import {
  decodePublicUserId,
  DEFAULT_GUEST_NAME,
  finalizeGuestPhoneUpgrade,
  reloadWithFreshProfile
} from "@/lib/guestAccount";
import {
  registerPhoneVerifyOpener,
  type PhoneVerifyOpenRequest
} from "@/lib/publicAuthGate";
import styles from "./PhoneVerifyDialog.module.css";

type Step = "notice" | "mobile" | "code" | "existing";

type ValidateResponse = {
  success?: boolean;
  message?: string;
  type?: string;
  data?: {
    token?: string;
    id?: number | string;
    type?: string;
    name?: string;
  } | null;
};

type PendingAuth = {
  token: string;
  userId: number | string;
  type: string;
};

/**
 * In-app phone OTP for guests. Same webhook contract as PlasmicLogin:
 * POST users/auth → POST /users/validate → cookie `token` (+ setProfile for new users).
 */
export default function PhoneVerifyDialog() {
  const [open, setOpen] = React.useState(false);
  const [request, setRequest] = React.useState<PhoneVerifyOpenRequest | null>(
    null
  );
  const [step, setStep] = React.useState<Step>("notice");
  const [mobile, setMobile] = React.useState("");
  const [digits, setDigits] = React.useState(["", "", "", ""]);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [pendingAuth, setPendingAuth] = React.useState<PendingAuth | null>(
    null
  );
  const inputRefs = React.useRef<Array<HTMLInputElement | null>>([]);
  const autoSubmitRef = React.useRef(false);
  const guestNameRef = React.useRef("");

  const openDialog = React.useCallback((next: PhoneVerifyOpenRequest) => {
    guestNameRef.current = readGuestSession()?.name || "";
    setRequest(next);
    setStep("notice");
    setMobile("");
    setDigits(["", "", "", ""]);
    setError("");
    setBusy(false);
    setPendingAuth(null);
    autoSubmitRef.current = false;
    setOpen(true);
  }, []);

  React.useEffect(() => {
    registerPhoneVerifyOpener(openDialog);
    return () => registerPhoneVerifyOpener(null);
  }, [openDialog]);

  const resetAndClose = React.useCallback(() => {
    setOpen(false);
    setRequest(null);
    setPendingAuth(null);
  }, []);

  const finishVerified = React.useCallback(
    async (auth: PendingAuth, linkGuestName: boolean) => {
      const guestToken = String(readCookie(PUBLIC_AUTH_COOKIE_NAME) || "");
      const guestId = decodePublicUserId(guestToken);
      const guestName =
        guestNameRef.current ||
        readGuestSession()?.name ||
        DEFAULT_GUEST_NAME;
      await finalizeGuestPhoneUpgrade({
        guestToken,
        guestId,
        guestName,
        authToken: auth.token,
        authUserId: auth.userId,
        linkGuestName
      });
      guestNameRef.current = "";
      resetAndClose();
      await reloadWithFreshProfile(auth.token);
    },
    [resetAndClose]
  );

  const sendOtp = React.useCallback(async () => {
    const phoneError = getPhoneError(mobile, true);
    if (phoneError) {
      setError(phoneError);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(resolveApiUrl("users/auth"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobile.trim() })
      });
      const payload = (await res.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
      } | null;
      if (!res.ok || payload?.success === false) {
        setError(
          String(payload?.message || "").trim() ||
            "ارسال کد تأیید ناموفق بود."
        );
        setBusy(false);
        return;
      }
      setDigits(["", "", "", ""]);
      autoSubmitRef.current = false;
      setStep("code");
      window.setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
    } finally {
      setBusy(false);
    }
  }, [mobile]);

  const verifyOtp = React.useCallback(
    async (codeOverride?: string) => {
      const code =
        codeOverride ||
        digits.join("").replace(/\D/g, "").slice(0, 4);
      if (code.length !== 4) {
        setError("کد چهار رقمی را وارد کنید");
        return;
      }
      setBusy(true);
      setError("");
      try {
        const res = await fetch(resolveApiUrl("/users/validate"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mobile: mobile.trim(), code })
        });
        const payload = (await res.json().catch(() => null)) as ValidateResponse | null;
        const token = String(payload?.data?.token || "").trim();
        const userId = payload?.data?.id;
        if (!res.ok || payload?.success === false || !token || userId == null) {
          setError(
            String(payload?.message || "").trim() || "کد تأیید نادرست است."
          );
          autoSubmitRef.current = false;
          setBusy(false);
          return;
        }
        const type = String(payload?.type || payload?.data?.type || "");
        const auth: PendingAuth = { token, userId, type };

        // Existing phone account → confirm before switching away from guest name.
        if (type !== "install") {
          setPendingAuth(auth);
          setStep("existing");
          setBusy(false);
          return;
        }

        const guestName =
          guestNameRef.current ||
          readGuestSession()?.name ||
          DEFAULT_GUEST_NAME;
        guestNameRef.current = guestName;
        await finishVerified(auth, true);
      } catch (e) {
        setError(
          e instanceof Error && e.message
            ? e.message
            : "ارتباط با سرور برقرار نشد."
        );
        autoSubmitRef.current = false;
        setBusy(false);
      }
    },
    [digits, finishVerified, mobile]
  );

  const onDigitChange = (index: number, raw: string) => {
    const value = raw.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (error) setError("");
    autoSubmitRef.current = false;
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
    if (next.every(d => d !== "") && !autoSubmitRef.current) {
      autoSubmitRef.current = true;
      void verifyOtp(next.join(""));
    }
  };

  const onDigitKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const onDigitPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 4);
    if (!pasted) return;
    event.preventDefault();
    const next = ["", "", "", ""];
    for (let i = 0; i < pasted.length; i += 1) next[i] = pasted[i];
    setDigits(next);
    autoSubmitRef.current = false;
    if (pasted.length === 4) {
      autoSubmitRef.current = true;
      void verifyOtp(pasted);
    } else {
      inputRefs.current[Math.min(pasted.length, 3)]?.focus();
    }
  };

  return (
    <Dialog
      className={styles.dialog}
      modalHashId="phone-verify"
      nopadding={true}
      opendialog={open}
      onOpendialogChange={(val: unknown) => {
        if (!val) resetAndClose();
      }}
      disableOpenAutoFocus={step === "code"}
    >
      <div className={styles.body} dir="rtl">
        <h2 className={styles.title}>
          {step === "existing" ? "حساب قبلی" : "تأیید شماره موبایل"}
        </h2>

        {step === "notice" ? (
          <>
            <p className={styles.message}>
              {request?.message ||
                "برای انجام این عملیات باید شماره موبایل خود را تأیید کنید."}
            </p>
            <Button
              className={styles.primary}
              size="extraLarge"
              onClick={() => {
                setStep("mobile");
                setError("");
              }}
              label={<span>ادامه</span>}
            />
            <button
              type="button"
              className={styles.secondary}
              onClick={resetAndClose}
            >
              انصراف
            </button>
          </>
        ) : null}

        {step === "mobile" ? (
          <>
            <p className={styles.hint}>
              شماره موبایل خود را وارد کنید تا کد تأیید ارسال شود.
            </p>
            <TextInput
              value={mobile}
              type="lineBoxDark"
              size="langh"
              onChange={value => {
                setMobile(String(value ?? ""));
                if (error) setError("");
              }}
              placeholder="09xxxxxxxxx"
              ariaLabel="شماره موبایل"
              inputMode="tel"
              error={error ? "error" : undefined}
            />
            {error ? <p className={styles.error}>{error}</p> : null}
            <Button
              className={styles.primary}
              loading={busy}
              size="extraLarge"
              onClick={() => void sendOtp()}
              label={<span>ارسال کد</span>}
            />
            <button
              type="button"
              className={styles.secondary}
              onClick={resetAndClose}
            >
              انصراف
            </button>
          </>
        ) : null}

        {step === "code" ? (
          <>
            <p className={styles.hint}>
              رمز یک بار مصرف به شماره{" "}
              <span className={styles.boldMobile}>{mobile}</span> پیامک شد.
            </p>
            <div
              className={`otp-wrapper ${styles.otpHost}`}
              id="phoneVerifyOtp"
            >
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={el => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  className="otp-input"
                  value={digit}
                  aria-label={`رقم ${index + 1} کد تأیید`}
                  onChange={event => onDigitChange(index, event.target.value)}
                  onKeyDown={event => onDigitKeyDown(index, event)}
                  onPaste={onDigitPaste}
                  disabled={busy}
                />
              ))}
            </div>
            {error ? <p className={styles.error}>{error}</p> : null}
            <div id="codeButten" className={styles.codeButtonWrap}>
              <Button
                className={styles.primary}
                loading={busy}
                size="extraLarge"
                onClick={() => void verifyOtp()}
                label={<span>تأیید</span>}
              />
            </div>
            <button
              type="button"
              className={styles.secondary}
              disabled={busy}
              onClick={() => void sendOtp()}
            >
              ارسال مجدد کد
            </button>
          </>
        ) : null}

        {step === "existing" ? (
          <>
            <p className={styles.message}>
              شما با این شماره قبلاً حساب داشته‌اید. آیا می‌خواهید وارد حساب
              قبلی خود شوید؟
            </p>
            {error ? <p className={styles.error}>{error}</p> : null}
            <Button
              className={styles.primary}
              loading={busy}
              size="extraLarge"
              onClick={() => {
                if (!pendingAuth) return;
                setBusy(true);
                void finishVerified(pendingAuth, false).catch(e => {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "ورود به حساب قبلی ناموفق بود."
                  );
                  setBusy(false);
                });
              }}
              label={<span>ورود به حساب</span>}
            />
            <button
              type="button"
              className={styles.secondary}
              disabled={busy}
              onClick={() => {
                setPendingAuth(null);
                setDigits(["", "", "", ""]);
                autoSubmitRef.current = false;
                setError("");
                setStep("mobile");
              }}
            >
              انصراف
            </button>
          </>
        ) : null}
      </div>
    </Dialog>
  );
}
