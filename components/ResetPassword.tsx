import * as React from "react";
import axios, { AxiosError } from "axios";
import { classNames } from "@plasmicapp/react-web";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import { useRouter } from "next/router";
import { AntdProgress } from "@plasmicpkgs/antd5/skinny/registerProgress";
import TextInput from "./TextInput";
import Hide from "./Hide";
import Button from "./Button";
import sty from "./plasmic/sayban/PlasmicCreateAccont.module.css";
import { _useStyleTokens } from "./plasmic/sayban/PlasmicStyleTokensProvider";

const RESET_PASSWORD_URL =
  "https://sayban.darkube.ir/webhook/auth/reset-password";

const DEFAULT_SUCCESS_MESSAGE = "رمز عبور با موفقیت تغییر یافت.";
const DEFAULT_ERROR_MESSAGE =
  "خطا در تغییر رمز عبور. لطفاً دوباره تلاش کنید.";
const MISSING_PARAMS_MESSAGE =
  "لینک بازیابی نامعتبر است. لطفاً دوباره درخواست بازیابی رمز عبور دهید.";

type ToastType = "success" | "error";

type ApiPayload = {
  success?: boolean;
  message?: string;
  status?: string;
};

type VisibilityState = {
  show?: boolean;
  type: "password" | "text";
};

export interface ResetPasswordProps {
  email?: string;
  token?: string;
  onBackToLogin?: () => void;
  className?: string;
}

function getQueryParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? "";
  }
  return typeof value === "string" ? value.trim() : "";
}

function calculatePasswordScore(password: string): number {
  let score = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&.]/.test(password),
  };
  Object.values(checks).forEach(check => {
    if (check) {
      score += 20;
    }
  });
  return score;
}

function getProgressStrokeColor(score: number): string {
  if (score <= 40) {
    return "#e03131";
  }
  if (score <= 80) {
    return "#f08c00";
  }
  return "#2f9e44";
}

function extractApiMessage(data: unknown, fallback: string): string {
  if (typeof data === "string" && data.trim()) {
    return data.trim();
  }
  if (data && typeof data === "object") {
    const payload = data as ApiPayload;
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message.trim();
    }
    if (typeof payload.status === "string" && payload.status.trim()) {
      return payload.status.trim();
    }
  }
  return fallback;
}

function isApiSuccess(data: unknown): boolean {
  if (data && typeof data === "object") {
    const payload = data as ApiPayload;
    if (payload.success === false) {
      return false;
    }
    if (
      typeof payload.status === "string" &&
      /error|fail|invalid/i.test(payload.status)
    ) {
      return false;
    }
  }
  return true;
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

function usePasswordVisibilityToggle() {
  const $globalActions = useGlobalActions?.();
  const [visibility, setVisibility] = React.useState<VisibilityState>({
    type: "password",
  });

  const handleHideClick = React.useCallback(async () => {
    setVisibility(prev => ({
      show: !prev.show,
      type: "text",
    }));

    const waitAction = ($globalActions as Record<string, (ms: number) => Promise<void>> | null)?.[
      "Fragment.wait"
    ];
    if (waitAction) {
      await waitAction(3000);
    } else {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    setVisibility(prev => ({
      show: !prev.show,
      type: "password",
    }));
  }, [$globalActions]);

  return {
    visibility,
    handleHideClick,
    setVisibility,
  };
}

function ResetPassword({
  email: emailProp,
  token: tokenProp,
  onBackToLogin,
  className,
}: ResetPasswordProps) {
  const router = useRouter();
  const styleTokensClassNames = _useStyleTokens();
  const $globalActions = useGlobalActions?.();

  const [password, setPassword] = React.useState("");
  const [repeatPassword, setRepeatPassword] = React.useState("");
  const [savePass, setSavePass] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  const passwordVisibility = usePasswordVisibilityToggle();
  const repeatVisibility = usePasswordVisibilityToggle();

  const emailParam = React.useMemo(() => {
    if (emailProp?.trim()) {
      return emailProp.trim();
    }
    if (!router.isReady) {
      return "";
    }
    return getQueryParam(router.query.email);
  }, [emailProp, router.isReady, router.query.email]);

  const tokenParam = React.useMemo(() => {
    if (tokenProp?.trim()) {
      return tokenProp.trim();
    }
    if (!router.isReady) {
      return "";
    }
    return getQueryParam(router.query.token);
  }, [tokenProp, router.isReady, router.query.token]);

  const hasRequiredParams = Boolean(emailParam && tokenParam);
  const isReady = router.isReady || Boolean(emailProp && tokenProp);

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

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setSavePass(calculatePasswordScore(value));
  };

  const handleSubmit = async (event?: React.FormEvent | React.MouseEvent) => {
    event?.preventDefault?.();

    if (loading) {
      return;
    }

    if (!hasRequiredParams) {
      showToast("error", MISSING_PARAMS_MESSAGE);
      return;
    }

    if (!password) {
      showToast("error", "رمز عبور را وارد کنید");
      return;
    }

    if (!repeatPassword) {
      showToast("error", "تکرار رمز عبور را وارد کنید");
      return;
    }

    if (savePass < 60) {
      showToast("error", "رمز عبور ضعیف است");
      return;
    }

    if (password !== repeatPassword) {
      showToast("error", "رمز عبور و تکرار آن یکسان نیست");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post<ApiPayload | string>(
        RESET_PASSWORD_URL,
        {
          email: emailParam,
          token: tokenParam,
          password,
        },
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
        setPassword("");
        setRepeatPassword("");
        setSavePass(0);

        // هدایت کاربر به صفحه لاگین پس از موفقیت
        setTimeout(() => {
          if (onBackToLogin) {
            onBackToLogin();
          } else {
            router.push("/login"); // در صورت نیاز مسیر صفحه لاگین خود را اینجا قرار دهید
          }
        }, 1500);

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

  if (!isReady) {
    return null;
  }

  return (
    <div
      dir="rtl"
      className={classNames(
        "all",
        "root_reset_qARqpE4p5tZmJuNxFbTaPz",
        "plasmic_default_styles",
        "plasmic_mixins",
        styleTokensClassNames,
        sty.root,
        "dark",
        className
      )}
    >
      <div className={classNames("all", sty.freeBox___98Omj)}>
        <div className={classNames("all", "__wab_text", sty.text__ey6Nd)}>
          تنظیم رمز عبور جدید
        </div>
        <div className={classNames("all", "__wab_text", sty.text___2IjOq)}>
          رمز عبور جدید خود را وارد کنید.
        </div>
      </div>

      {!hasRequiredParams ? (
        <div className={classNames("all", "__wab_text", sty.text__t1Nyb)} role="alert">
          {MISSING_PARAMS_MESSAGE}
        </div>
      ) : (
        <>
          <div className={classNames("all", sty.freeBox__yUlH5)}>
            <TextInput
              className={classNames("__wab_instance", sty.password)}
              inputType={passwordVisibility.visibility.type}
              onChange={(value: string) => handlePasswordChange(value)}
              placeholder="حداقل ۸ کاراکتر، حروف و عدد"
              size="langh"
              type="soft"
              value={password}
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
            />

            <Hide
              className={classNames("__wab_instance", sty.hide)}
              onClick={passwordVisibility.handleHideClick}
              onShowChange={show =>
                passwordVisibility.setVisibility(prev => ({
                  ...prev,
                  show: Boolean(show),
                }))
              }
              onTypeChange={type =>
                passwordVisibility.setVisibility(prev => ({
                  ...prev,
                  type: (type as "password" | "text") ?? "password",
                }))
              }
              show={passwordVisibility.visibility.show}
              type={passwordVisibility.visibility.type}
            />
          </div>

          <AntdProgress
            className={classNames("__wab_instance", sty.progress)}
            gradient={[]}
            percent={savePass}
            showInfo={false}
            status="exception"
            stepColors={[]}
            steps={5}
            strokeColor={getProgressStrokeColor(savePass)}
            strokeLinecap="round"
            type="line"
          />

          <div className={classNames("all", "__wab_text", sty.text__t1Nyb)}>
            رمز عبور باید حداقل ۸ کاراکتر و ترکیبی از حروف و اعداد باشد.
          </div>

          <div className={classNames("all", sty.freeBox___0NB5)}>
            <TextInput
              className={classNames("__wab_instance", sty.repeatPassword)}
              error={
                repeatPassword.length > 0 && repeatPassword !== password
              }
              inputType={repeatVisibility.visibility.type}
              onChange={(value: string) => setRepeatPassword(value)}
              placeholder="رمز عبور جدید را دوباره وارد کنید"
              size="langh"
              type="soft"
              value={repeatPassword}
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
            />

            <Hide
              className={classNames("__wab_instance", sty.hide2)}
              onClick={repeatVisibility.handleHideClick}
              onShowChange={show =>
                repeatVisibility.setVisibility(prev => ({
                  ...prev,
                  show: Boolean(show),
                }))
              }
              onTypeChange={type =>
                repeatVisibility.setVisibility(prev => ({
                  ...prev,
                  type: (type as "password" | "text") ?? "password",
                }))
              }
              show={repeatVisibility.visibility.show}
              type={repeatVisibility.visibility.type}
            />
          </div>

          <Button
            className={classNames("__wab_instance", sty.button)}
            label={
              <div className={classNames("all", "__wab_text", sty.text__mrUbL)}>
                تایید رمز
              </div>
            }
            loading={loading}
            onClick={handleSubmit}
          />

          <Button
            className={classNames("__wab_instance", sty.button3)}
            color="clear"
            label={
              <div className={classNames("all", "__wab_text", sty.text___8PGo)}>
                بازگشت به ورود
              </div>
            }
            onClick={handleBackToLogin}
          />
        </>
      )}
    </div>
  );
}

export default ResetPassword;