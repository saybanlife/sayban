import * as React from "react";
import { useRouter } from "next/router";
import { useGlobalActions } from "@plasmicapp/react-web/lib/host";
import {
  PlasmicCreateAccont,
  DefaultCreateAccontProps
} from "./plasmic/sayban/PlasmicCreateAccont";
import { HTMLElementRefOf } from "@plasmicapp/react-web";
import CenterRegisterStep2, {
  type CenterRegisterCredentials
} from "./centerPanel/CenterRegisterStep2";
import { toDbEnumValue } from "./centerPage/centerEnumLocales";
import {
  passwordStrengthScore
} from "./formFieldRules";
import { getCreateStep1FieldErrors } from "./centerPanel/validateCenterWizard";
import { PANEL_ROUTES } from "@/lib/apiRoutes";
import { uploadPanelImages } from "@/lib/panelLiomUpload";
import styles from "./CreateAccont.module.css";

export interface CreateAccontProps extends DefaultCreateAccontProps {}

type ApiEnvelope = {
  success?: boolean;
  message?: string;
  result?:
    | { url?: string; index?: number }[]
    | {
        center_id?: number | string;
        id?: number | string;
      }
    | Record<string, unknown>;
};

type ApiFn = (
  method: string,
  url: string,
  params?: unknown,
  body?: unknown,
  config?: unknown
) => Promise<{ data?: ApiEnvelope; status?: number } | undefined>;

function extractMessage(data: unknown, fallback: string): string {
  if (typeof data === "string" && data.trim()) return data.trim();
  if (data && typeof data === "object" && "message" in data) {
    const message = String((data as { message?: unknown }).message || "").trim();
    if (message) return message;
  }
  return fallback;
}

function extractCenterId(data: ApiEnvelope | undefined): number | null {
  const result = data?.result;
  if (!result || Array.isArray(result) || typeof result !== "object") return null;
  const raw = (result as { center_id?: unknown }).center_id;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function FieldErrorWrap({
  error,
  children
}: {
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.emailWrap}>
      {children}
      {error ? <span className={styles.emailError}>{error}</span> : null}
    </div>
  );
}

function CreateAccont_(
  props: CreateAccontProps,
  ref: HTMLElementRefOf<"div">
) {
  const router = useRouter();
  const globalActions = useGlobalActions();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [centerName, setCenterName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [repeatPassword, setRepeatPassword] = React.useState("");
  const [centerId, setCenterId] = React.useState<number | null>(null);
  const [attempted, setAttempted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const toast = React.useCallback(
    (type: "success" | "error", message: string) => {
      globalActions?.["Fragment.showToast"]?.(type, message, "top-left");
    },
    [globalActions]
  );

  const apiRequest = React.useCallback<ApiFn>(
    (method, url, params, body, config) => {
      const fn = globalActions?.["Fragment.apiRequest"] as ApiFn | undefined;
      if (!fn) return Promise.resolve(undefined);
      return fn(method, url, params, body, config);
    },
    [globalActions]
  );

  const fieldErrors = getCreateStep1FieldErrors({
    centerName,
    email,
    password,
    repeatPassword,
    passwordStrengthScore
  });
  const show = (key: keyof typeof fieldErrors) =>
    Boolean(attempted && fieldErrors[key]);

  const credentials: CenterRegisterCredentials = {
    centerName: centerName.trim(),
    email: email.trim(),
    password
  };

  /** Phase 1 — create pending center + admin, return valid center_id. */
  const createCenter = React.useCallback(async (): Promise<number | null> => {
    if (centerId) return centerId;

    const registerRes = await apiRequest(
      "POST",
      PANEL_ROUTES.userRegister,
      undefined,
      {
        center_name: credentials.centerName,
        email: credentials.email,
        emaile: credentials.email,
        password: credentials.password
      }
    );

    if (!registerRes?.data?.success) {
      toast(
        "error",
        extractMessage(
          registerRes?.data,
          "ایجاد مرکز ناموفق بود. لطفاً دوباره تلاش کنید."
        )
      );
      return null;
    }

    const id = extractCenterId(registerRes.data);
    if (!id) {
      toast("error", "شناسه مرکز معتبر دریافت نشد.");
      return null;
    }
    setCenterId(id);
    return id;
  }, [
    apiRequest,
    centerId,
    credentials.centerName,
    credentials.email,
    credentials.password,
    toast
  ]);

  const handleContinue = React.useCallback(async () => {
    setAttempted(true);
    const nextErrors = getCreateStep1FieldErrors({
      centerName,
      email,
      password,
      repeatPassword,
      passwordStrengthScore
    });
    const first = Object.values(nextErrors)[0];
    if (first) {
      toast("error", first);
      return;
    }

    setSubmitting(true);
    try {
      const id = await createCenter();
      if (!id) return;
      setStep(2);
    } finally {
      setSubmitting(false);
    }
  }, [
    centerName,
    createCenter,
    email,
    password,
    repeatPassword,
    toast
  ]);

  /** Phase 2 — upload docs and update complementary fields with center_id. */
  const handleRegister = React.useCallback(
    async ({
      details,
      files
    }: {
      details: {
        careDomainFa: string;
        managerLastName: string;
        centerName: string;
        phone: string;
      };
      files: {
        establishment_notice: File;
        license_number: File;
        registration_docs: File;
      };
    }) => {
      const careDomain = toDbEnumValue("care_domain", details.careDomainFa);
      if (!careDomain) {
        toast("error", "نوع مرکز را انتخاب کنید.");
        return;
      }

      setSubmitting(true);
      try {
        const id = await createCenter();
        if (!id) return;

        let urls: string[];
        try {
          urls = await uploadPanelImages(
            [
              files.establishment_notice,
              files.license_number,
              files.registration_docs
            ],
            { register: true }
          );
        } catch (error) {
          toast(
            "error",
            error instanceof Error
              ? error.message
              : "بارگذاری مدارک ناموفق بود."
          );
          return;
        }
        if (urls.length < 3) {
          toast("error", "بارگذاری مدارک ناموفق بود.");
          return;
        }

        const completeRes = await apiRequest(
          "POST",
          PANEL_ROUTES.userRegisterComplete,
          undefined,
          {
            center_id: id,
            email: credentials.email,
            emaile: credentials.email,
            password: credentials.password,
            center_name: details.centerName,
            mobile: details.phone,
            phone: details.phone,
            care_domain: careDomain,
            manager_last_name: details.managerLastName,
            registered_center_name: details.centerName,
            establishment_notice: urls[0],
            license_number: urls[1],
            registration_docs: urls[2]
          }
        );

        if (completeRes?.data?.success) {
          toast(
            "success",
            extractMessage(
              completeRes.data,
              "درخواست ثبت‌نام مرکز ثبت شد و در انتظار تأیید است."
            )
          );
          setStep(1);
          setCenterId(null);
          await router.replace("/panel/login");
          return;
        }

        toast(
          "error",
          extractMessage(
            completeRes?.data,
            "تکمیل اطلاعات مرکز ناموفق بود. لطفاً دوباره تلاش کنید."
          )
        );
      } catch {
        toast("error", "ثبت‌نام ناموفق بود. لطفاً دوباره تلاش کنید.");
      } finally {
        setSubmitting(false);
      }
    },
    [apiRequest, createCenter, credentials.email, credentials.password, router, toast]
  );

  if (step === 2) {
    return (
      <CenterRegisterStep2
        // Keep Plasmic hide CSS (`.createAccont.__wab_instance`) applicable.
        className={props.className}
        credentials={credentials}
        submitting={submitting}
        onBack={() => setStep(1)}
        onSubmit={payload => {
          void handleRegister(payload);
        }}
      />
    );
  }

  return (
    <PlasmicCreateAccont
      {...props}
      root={{
        ref,
        render: (ps: any, Comp: any) => (
          <Comp {...ps}>
            <p className={styles.stepHint}>مرحله ۱ از ۲ — اطلاعات ورود</p>
            {ps.children as React.ReactNode}
          </Comp>
        )
      }}
      userName={{
        render: (ps: any, Comp: React.ComponentType<any>) => (
          <FieldErrorWrap error={show("email") ? fieldErrors.email : undefined}>
            <Comp
              {...ps}
              placeholder="ایمیل خود را وارد کنید"
              inputType="email"
              autoComplete="email"
              error={show("email") ? "error" : ps.error}
              onChange={(value: string) => {
                setEmail(String(value ?? ""));
                setCenterId(null);
                (ps.onChange as ((next: string) => void) | undefined)?.(value);
              }}
            />
          </FieldErrorWrap>
        )
      }}
      centerName={{
        render: (ps: any, Comp: React.ComponentType<any>) => (
          <FieldErrorWrap
            error={show("centerName") ? fieldErrors.centerName : undefined}
          >
            <Comp
              {...ps}
              error={show("centerName") ? "error" : ps.error}
              onChange={(value: string) => {
                setCenterName(String(value ?? ""));
                setCenterId(null);
                (ps.onChange as ((next: string) => void) | undefined)?.(value);
              }}
            />
          </FieldErrorWrap>
        )
      }}
      password={{
        render: (ps: any, Comp: React.ComponentType<any>) => (
          <FieldErrorWrap
            error={show("password") ? fieldErrors.password : undefined}
          >
            <Comp
              {...ps}
              error={show("password") ? "error" : ps.error}
              onChange={(value: string) => {
                setPassword(String(value ?? ""));
                setCenterId(null);
                (ps.onChange as ((next: string) => void) | undefined)?.(value);
              }}
            />
          </FieldErrorWrap>
        )
      }}
      repeatPassword={{
        render: (ps: any, Comp: React.ComponentType<any>) => (
          <FieldErrorWrap
            error={
              show("repeatPassword") ? fieldErrors.repeatPassword : undefined
            }
          >
            <Comp
              {...ps}
              error={show("repeatPassword") ? "error" : ps.error}
              onChange={(value: string) => {
                setRepeatPassword(String(value ?? ""));
                (ps.onChange as ((next: string) => void) | undefined)?.(value);
              }}
            />
          </FieldErrorWrap>
        )
      }}
      button={{
        // Replace Plasmic register onClick entirely — the generated handler
        // still posts the old one-shot register payload.
        render: (ps: any, Comp: React.ComponentType<any>) => {
          const { onClick: _plasmicRegisterClick, ...rest } = ps ?? {};
          return (
            <Comp
              {...rest}
              loading={submitting || rest.loading}
              label={<div className={styles.submitLabel}>ادامه</div>}
              onClick={async () => {
                try {
                  await handleContinue();
                } catch {
                  toast("error", "ثبت‌نام ناموفق بود. لطفاً دوباره تلاش کنید.");
                }
              }}
            />
          );
        }
      }}
    />
  );
}

const CreateAccont = React.forwardRef(CreateAccont_);
export default CreateAccont;
