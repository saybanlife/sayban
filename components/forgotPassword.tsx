import * as React from "react";
import axios, { AxiosError } from "axios";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import TextInput from "./TextInput";
import Button from "./Button";
import styles from "./forgotPassword.module.css";

const FORGOT_PASSWORD_URL =
  "https://sayban.darkube.ir/webhook/forgot-password";

const DEFAULT_SUCCESS_MESSAGE = "درخواست شما با موفقیت ارسال شد.";
const DEFAULT_ERROR_MESSAGE =
  "خطا در ارسال درخواست. لطفاً دوباره تلاش کنید.";
const EMPTY_EMAIL_MESSAGE = "لطفاً ایمیل خود را وارد کنید.";
const INVALID_EMAIL_MESSAGE = "لطفاً یک ایمیل معتبر وارد کنید.";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ToastType = "success" | "error";

type ApiPayload = {
  success?: boolean;
  message?: string;
};

function extractApiMessage(data: unknown, fallback: string): string {
  if (typeof data === "string" && data.trim()) {
    return data.trim();
  }
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as ApiPayload).message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }
  return fallback;
}

function isApiSuccess(data: unknown): boolean {
  if (data && typeof data === "object" && "success" in data) {
    return (data as ApiPayload).success !== false;
  }
  return true;
}

export interface ForgotPasswordProps {
  onBackToLogin?: () => void;
  className?: string;
}

function ForgotPassword({ onBackToLogin, className }: ForgotPasswordProps) {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const $globalActions = useGlobalActions?.();

  const showToast = React.useCallback(
    (type: ToastType, message: string) => {
      const actionsAny = $globalActions as Record<
        string,
        (toastType: ToastType, toastMessage: string, placement: string) => void
      > | null;
      if (actionsAny?.["Fragment.showToast"]) {
        actionsAny["Fragment.showToast"](type, message, "top-left");
      }
    },
    [$globalActions]
  );

  const handleSubmit = async (event?: React.FormEvent | React.MouseEvent) => {
    event?.preventDefault?.();

    if (loading) {
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showToast("error", EMPTY_EMAIL_MESSAGE);
      return;
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      showToast("error", INVALID_EMAIL_MESSAGE);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post<ApiPayload | string>(
        FORGOT_PASSWORD_URL,
        { email: trimmedEmail },
        {
          headers: { "Content-Type": "application/json" },
          validateStatus: () => true,
        }
      );

      const { data, status } = response;
      const message = extractApiMessage(
        data,
        status >= 200 && status < 300
          ? DEFAULT_SUCCESS_MESSAGE
          : DEFAULT_ERROR_MESSAGE
      );

      if (status >= 200 && status < 300 && isApiSuccess(data)) {
        showToast("success", message);
        return;
      }

      showToast("error", message);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        showToast("error", resolveAxiosErrorMessage(error));
      } else {
        showToast("error", DEFAULT_ERROR_MESSAGE);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    if (loading) {
      return;
    }
    onBackToLogin?.();
  };

  const rootClassName = [styles.root, styles.darkTheme, "dark", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div dir="rtl" className={rootClassName}>
      <div className={styles.header}>
        <h1 className={styles.title}>بازیابی رمز عبور</h1>
        <p className={styles.subtitle}>
          ایمیل حساب کاربری خود را وارد کنید تا لینک بازیابی برای شما ارسال
          شود.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextInput
          className={styles.emailInput}
          placeholder="مثلاً name@example.com"
          size="langh"
          type="soft"
          inputType="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          value={email}
          onChange={(value: string) => setEmail(value)}
        />

        <Button
          className={styles.submitBtn}
          size="extraLarge"
          label={<span className={styles.submitLabel}>ارسال</span>}
          loading={loading}
          onClick={handleSubmit}
        />

        <Button
          className={styles.backBtn}
          color="clear"
          label={<span className={styles.backLabel}>بازگشت به ورود</span>}
          onClick={handleBackToLogin}
        />
      </form>
    </div>
  );
}

function resolveAxiosErrorMessage(error: AxiosError<ApiPayload | string>): string {
  if (error.response?.data !== undefined) {
    return extractApiMessage(error.response.data, DEFAULT_ERROR_MESSAGE);
  }

  if (error.code === "ERR_NETWORK") {
    return "اتصال برقرار نشد. اتصال اینترنت خود را بررسی کنید.";
  }

  if (error.code === "ECONNABORTED") {
    return "زمان درخواست به پایان رسید. لطفاً دوباره تلاش کنید.";
  }

  return DEFAULT_ERROR_MESSAGE;
}

export default ForgotPassword;
