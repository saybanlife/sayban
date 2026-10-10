/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/* prettier-ignore-start */

/** @jsxRuntime classic */
/** @jsx createPlasmicElementProxy */
/** @jsxFrag React.Fragment */

// Plasmic Project: qARqpE4p5tZmJuNxFbTaPz
// Component: NnzIun3_VRrR
// NOTE: restyled by hand to match the "درخواست‌های من" card design.
// Props / variants / event contract is unchanged, so parents keep working.
// The whole title row is now the "details" tap target (the separate
// "مشاهده جزئیات" button was removed).

import * as React from "react";
import { useRouter } from "next/router";

import {
  Flex as Flex__,
  PlasmicImg as PlasmicImg__,
  SingleBooleanChoiceArg,
  SingleChoiceArg,
  StrictProps,
  classNames,
  createPlasmicElementProxy,
  deriveRenderOpts,
  generateStateOnChangeProp,
  generateStateValueProp,
  hasVariant,
  useDollarState
} from "@plasmicapp/react-web";
import { useDataEnv } from "@plasmicapp/react-web/lib/host";

import { TextCollapse } from "@/components/TextCollapse"; // plasmic-import: 4siMWQuiaqGI/codeComponent
import UploudeTime from "../../UploudeTime"; // plasmic-import: IxvwO5AMD5ex/component
import Button from "../../Button"; // plasmic-import: 2MRRFY7jUAge/component
import Status from "../../Status";
import {
  buildReservationSteps,
  reservationStepCaption,
  isNurseReservation,
  reservationStatusHint
} from "../../reservation/reservationDetailsModel";
import { reservationDisplayTime } from "../../reservation/visitBooking";
import { _useStyleTokens } from "./PlasmicStyleTokensProvider"; // plasmic-import: qARqpE4p5tZmJuNxFbTaPz/styleTokensProvider

import "@plasmicapp/react-web/lib/plasmic.css";

import sty from "./PlasmicItemBooking.module.css"; // plasmic-import: NnzIun3_VRrR/css

import __lib_md5 from "md5";

createPlasmicElementProxy;

export type PlasmicItemBooking__VariantMembers = {
  booking: "booking";
  home: "home";
  status:
    | "offersReceived"
    | "awaitingPayment"
    | "completed"
    | "rejected"
    | "canceled";
};
export type PlasmicItemBooking__VariantsArgs = {
  booking?: SingleBooleanChoiceArg<"booking">;
  home?: SingleBooleanChoiceArg<"home">;
  status?: SingleChoiceArg<
    "offersReceived" | "awaitingPayment" | "completed" | "rejected" | "canceled"
  >;
};
type VariantPropType = keyof PlasmicItemBooking__VariantsArgs;
export const PlasmicItemBooking__VariantProps = new Array<VariantPropType>(
  "booking",
  "home",
  "status"
);

export type PlasmicItemBooking__ArgsType = {
  item?: any;
  onClick?: (event: any) => void;
  goToCenter?: (event: any) => void;
  goToDetails?: (event: any) => void;
  goToOffers?: () => void;
  pay?: () => void;
};
type ArgPropType = keyof PlasmicItemBooking__ArgsType;
export const PlasmicItemBooking__ArgProps = new Array<ArgPropType>(
  "item",
  "onClick",
  "goToCenter",
  "goToDetails",
  "goToOffers",
  "pay"
);

export type PlasmicItemBooking__OverridesType = {
  root?: Flex__<"div">;
  img?: Flex__<typeof PlasmicImg__>;
  textCollapse?: Flex__<typeof TextCollapse>;
  uploudeTime?: Flex__<typeof UploudeTime>;
  button3?: Flex__<typeof Button>;
  button4?: Flex__<typeof Button>;
  button2?: Flex__<typeof Button>;
};

export interface DefaultItemBookingProps {
  item?: any;
  onClick?: (event: any) => void;
  goToCenter?: (event: any) => void;
  goToDetails?: (event: any) => void;
  goToOffers?: () => void;
  pay?: () => void;
  booking?: SingleBooleanChoiceArg<"booking">;
  home?: SingleBooleanChoiceArg<"home">;
  status?: SingleChoiceArg<
    "offersReceived" | "awaitingPayment" | "completed" | "rejected" | "canceled"
  >;
  className?: string;
}

const $$ = { md5: __lib_md5 };

// status -> look & copy (matches the design boards)
const STATUS_UI = {
  offersReceived: {
    pill: "اقدام شما",
    pillClass: "pill_action",
    title: "پیشنهاد رسید",
    subtitle: "مراقب مناسب را انتخاب کنید",
    step: 2,
    action: true
  },
  awaitingPayment: {
    pill: "اقدام شما",
    pillClass: "pill_action",
    title: "در انتظار پرداخت",
    subtitle: "برای قطعی شدن رزرو پرداخت کنید",
    step: 3,
    action: true
  },
  completed: {
    pill: "تمام‌شد",
    pillClass: "",
    title: "خدمت انجام شد",
    subtitle: "",
    step: 5,
    action: false
  },
  rejected: {
    pill: "رد شد",
    pillClass: "pill_neutral",
    title: "درخواست رد شد",
    subtitle: "",
    step: 0,
    action: false
  },
  canceled: {
    pill: "لغوشده",
    pillClass: "pill_danger",
    title: "درخواست لغو شد",
    subtitle: "",
    step: 0,
    action: false
  }
};
const DEFAULT_UI = {
  pill: "در جریان",
  pillClass: "",
  title: "",
  subtitle: "",
  step: 1,
  action: false
};

const STATUS_TITLES = {
  pending: "در انتظار بررسی مرکز",
  awaitingOffers: "در انتظار پیشنهاد مراکز",
  offersReceived: "پیشنهاد مرکز آماده است",
  nurseSelected: "پرستار انتخاب شد",
  awaitingPayment: "در انتظار پرداخت",
  paymentCompleted: "پرداخت انجام شد",
  awaitingCenterContact: "در انتظار تماس مرکز",
  underFinalReview: "در حال بررسی نهایی",
  confirmed: "رزرو شما تأیید شد",
  finalConfirmed: "رزرو شما قطعی شد",
  readyForDispatch: "آماده اعزام",
  inProgress: "خدمت در حال انجام است",
  completed: "خدمت انجام شد",
  serviceFinished: "خدمت پایان یافت",
  canceled: "رزرو لغو شد",
  rejected: "درخواست رد شد",
  refunded: "وجه رزرو مسترد شد",
  userNoResponse: "رزرو متوقف شد"
};

function useNextRouter() {
  try {
    return useRouter();
  } catch {}
  return undefined;
}

function formatReservationTime(value) {
  const time = reservationDisplayTime(value);
  if (!time) return "";
  const date = new Intl.DateTimeFormat("fa-IR", {
    month: "long",
    day: "numeric"
  }).format(new Date(time.year, time.month - 1, time.day));
  const number = new Intl.NumberFormat("fa-IR", {
    minimumIntegerDigits: 2,
    useGrouping: false
  });
  return `${date}، ساعت ${number.format(time.hour)}:${number.format(time.minute)}`;
}

function PlasmicItemBooking__RenderFunc(props: {
  variants: PlasmicItemBooking__VariantsArgs;
  args: PlasmicItemBooking__ArgsType;
  overrides: PlasmicItemBooking__OverridesType;
  forNode?: string;
}) {
  const { variants, overrides, forNode } = props;

  const args = React.useMemo(
    () =>
      Object.assign(
        {},
        Object.fromEntries(
          Object.entries(props.args).filter(([_, v]) => v !== undefined)
        )
      ),
    [props.args]
  );

  const $props = { ...args, ...variants };
  const __nextRouter = useNextRouter();
  const $ctx = useDataEnv?.() || {};
  const refsRef = React.useRef({});
  const $refs = refsRef.current;

  const stateSpecs = React.useMemo(
    () => [
      { path: "booking", type: "private", variableType: "variant", initFunc: ({ $props }) => $props.booking },
      { path: "home", type: "private", variableType: "variant", initFunc: ({ $props }) => $props.home },
      { path: "status", type: "private", variableType: "variant", initFunc: ({ $props }) => $props.status },
      { path: "button2.loading", type: "private", variableType: "boolean", initFunc: () => undefined },
      { path: "button3.loading", type: "private", variableType: "boolean", initFunc: () => undefined },
      { path: "button4.loading", type: "private", variableType: "boolean", initFunc: () => undefined }
    ],
    [$props, $ctx, $refs]
  );

  const $state = useDollarState(stateSpecs, {
    $props,
    $ctx,
    $queries: {},
    $q: {},
    $refs
  });

  const styleTokensClassNames = _useStyleTokens();

  const isHome = hasVariant($state, "home", "home");
  const statusKey = [
    "offersReceived",
    "awaitingPayment",
    "completed",
    "rejected",
    "canceled"
  ].find(s => hasVariant($state, "status", s));
  const item = $props.item;
  const itemStatus = String(item?.status || statusKey || "pending");
  const steps = buildReservationSteps(item || null);
  const stepCaption = reservationStepCaption(item || null);
  const nurse = isNurseReservation(item || null);
  const metaText = [
    item?.service_name || (nurse ? "خدمات پرستاری" : "رزرو خدمت"),
    item?.staff?.name ? `پرستار ${item.staff.name}` : null
  ].filter(Boolean).join(" / ");
  const centerText = item?.center_name || "مرکز در حال انتخاب";
  const titleText =
    item?.status_title || STATUS_TITLES[itemStatus] || "وضعیت رزرو";
  const subtitleText =
    item?.status_subtitle ||
    formatReservationTime(item?.start_time) ||
    reservationStatusHint(itemStatus);

  const imgSrc =
    item?.main_image ??
    "https://web.sayban.app/plasmic/sayban/images/untitledPicturePng.png";

  const loadingChange = name => async (...eventArgs: any) => {
    generateStateOnChangeProp($state, [name, "loading"]).apply(null, eventArgs);
  };

  const showSelect = statusKey === "offersReceived";
  const showPay = statusKey === "awaitingPayment";
  const showRebook = statusKey === "completed" || statusKey === "rejected";

  const openDetails = args.goToDetails
    ? event => {
        event?.stopPropagation?.();
        args.goToDetails?.(event);
      }
    : undefined;

  return (
    <div
      data-plasmic-name={"root"}
      data-plasmic-override={overrides.root}
      data-plasmic-root={true}
      data-plasmic-for-node={forNode}
      className={classNames(
        "all",
        "root_reset_qARqpE4p5tZmJuNxFbTaPz",
        "plasmic_default_styles",
        "plasmic_mixins",
        styleTokensClassNames,
        sty.root
      )}
      onClick={args.onClick}
    >
      {/* row 1: meta + status pill */}
      <div className={classNames("all", sty.topRow)}>
        <div
          className={classNames("all", sty.avatarWrap, {
            [sty.avatarWraphome]: isHome
          })}
        >
          <PlasmicImg__
            data-plasmic-name={"img"}
            data-plasmic-override={overrides.img}
            alt={""}
            className={classNames(sty.img)}
            displayHeight={"100%"}
            displayMaxHeight={"none"}
            displayMaxWidth={"100%"}
            displayMinHeight={"0"}
            displayMinWidth={"0"}
            displayWidth={"100%"}
            height={"100%"}
            loading={"lazy"}
            src={imgSrc}
            width={"100%"}
          />
        </div>
        <span className={classNames("all", sty.meta)}>{metaText}</span>
        <Status status={itemStatus} className={sty.status} />
      </div>

      <div className={classNames("all", sty.centerName)}>{centerText}</div>

      {/* row 2: title, subtitle, chevron (tap = details) */}
      <div
        className={classNames("all", sty.mainRow, {
          [sty.mainRowclickable]: !!openDetails
        })}
        role={openDetails ? "button" : undefined}
        tabIndex={openDetails ? 0 : undefined}
        onClick={openDetails}
        onKeyDown={
          openDetails
            ? event => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openDetails(event);
                }
              }
            : undefined
        }
      >
        <div className={classNames("all", sty.textCol)}>
          <div className={classNames("all", sty.title)}>{titleText}</div>
          {subtitleText ? (
            <div className={classNames("all", sty.subtitle)}>{subtitleText}</div>
          ) : null}

        </div>
        <svg
          className={classNames("all", sty.chevron)}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </div>

      <div className={classNames("all", sty.progressBlock)}>
        <div className={classNames("all", sty.progress)} aria-label="مراحل رزرو">
          {steps.map(step => (
            <div
              key={step.key}
              title={step.label}
              className={classNames("all", sty.seg, {
                [sty.seg_done]: step.done && !step.current,
                [sty.seg_current]: step.current
              })}
            />
          ))}
        </div>
        {stepCaption ? (
          <div className={classNames("all", sty.progressCaption)}>
            {stepCaption}
          </div>
        ) : null}
      </div>

      <div className={classNames("all", sty.actions)} hidden>
        {showSelect ? (
          <Button
            data-plasmic-name={"button3"}
            data-plasmic-override={overrides.button3}
            className={classNames("__wab_instance", sty.button3)}
            color={"success"}
            label={
              <div className={classNames("all", "__wab_text", sty.btnTextPrimary)}>
                {"انتخاب پرستار"}
              </div>
            }
            loading={generateStateValueProp($state, ["button3", "loading"])}
            onClick={async event => {
              event?.stopPropagation?.();
              await $props["goToOffers"]?.();
            }}
            onLoadingChange={loadingChange("button3")}
          />
        ) : null}

        {showPay ? (
          <Button
            data-plasmic-name={"button4"}
            data-plasmic-override={overrides.button4}
            className={classNames("__wab_instance", sty.button4)}
            color={"success"}
            label={
              <div className={classNames("all", "__wab_text", sty.btnTextPrimary)}>
                {"پرداخت"}
              </div>
            }
            loading={generateStateValueProp($state, ["button4", "loading"])}
            onClick={async event => {
              event?.stopPropagation?.();
              if ($props.item && $props.item.id) {
                window.sessionStorage.setItem(
                  "payId",
                  $$.md5(String($props.item.id))
                );
              }
              await $props["pay"]?.();
            }}
            onLoadingChange={loadingChange("button4")}
          />
        ) : null}

        {showRebook ? (
          <Button
            data-plasmic-name={"button2"}
            data-plasmic-override={overrides.button2}
            className={classNames("__wab_instance", sty.button2)}
            color={"success"}
            label={
              <div className={classNames("all", "__wab_text", sty.btnText)}>
                {"رزرو مجدد"}
              </div>
            }
            loading={generateStateValueProp($state, ["button2", "loading"])}
            onClick={async event => {
              event?.stopPropagation?.();
              await $props["goToCenter"]?.();
            }}
            onLoadingChange={loadingChange("button2")}
          />
        ) : null}
      </div>
    </div>
  ) as React.ReactElement | null;
}

const PlasmicDescendants = {
  root: ["root", "img", "textCollapse", "uploudeTime", "button3", "button4", "button2"],
  img: ["img"],
  textCollapse: ["textCollapse"],
  uploudeTime: ["uploudeTime"],
  button3: ["button3"],
  button4: ["button4"],
  button2: ["button2"]
} as const;
type NodeNameType = keyof typeof PlasmicDescendants;
type DescendantsType<T extends NodeNameType> = (typeof PlasmicDescendants)[T][number];
type NodeDefaultElementType = {
  root: "div";
  img: typeof PlasmicImg__;
  textCollapse: typeof TextCollapse;
  uploudeTime: typeof UploudeTime;
  button3: typeof Button;
  button4: typeof Button;
  button2: typeof Button;
};

type ReservedPropsType = "variants" | "args" | "overrides";
type NodeOverridesType<T extends NodeNameType> = Pick<
  PlasmicItemBooking__OverridesType,
  DescendantsType<T>
>;
type NodeComponentProps<T extends NodeNameType> = {
  variants?: PlasmicItemBooking__VariantsArgs;
  args?: PlasmicItemBooking__ArgsType;
  overrides?: NodeOverridesType<T>;
} & Omit<PlasmicItemBooking__VariantsArgs, ReservedPropsType> &
  Omit<PlasmicItemBooking__ArgsType, ReservedPropsType> &
  Omit<NodeOverridesType<T>, ReservedPropsType | VariantPropType | ArgPropType> &
  Omit<
    Partial<React.ComponentProps<NodeDefaultElementType[T]>>,
    ReservedPropsType | VariantPropType | ArgPropType | DescendantsType<T>
  >;

function makeNodeComponent<NodeName extends NodeNameType>(nodeName: NodeName) {
  type PropsType = NodeComponentProps<NodeName> & { key?: React.Key };
  const func = function <T extends PropsType>(props: T & StrictProps<T, PropsType>) {
    const { variants, args, overrides } = React.useMemo(
      () =>
        deriveRenderOpts(props, {
          name: nodeName,
          descendantNames: PlasmicDescendants[nodeName],
          internalArgPropNames: PlasmicItemBooking__ArgProps,
          internalVariantPropNames: PlasmicItemBooking__VariantProps
        }),
      [props, nodeName]
    );
    return PlasmicItemBooking__RenderFunc({ variants, args, overrides, forNode: nodeName });
  };
  func.displayName = nodeName === "root" ? "PlasmicItemBooking" : `PlasmicItemBooking.${nodeName}`;
  return func;
}

export const PlasmicItemBooking = Object.assign(makeNodeComponent("root"), {
  img: makeNodeComponent("img"),
  textCollapse: makeNodeComponent("textCollapse"),
  uploudeTime: makeNodeComponent("uploudeTime"),
  button3: makeNodeComponent("button3"),
  button4: makeNodeComponent("button4"),
  button2: makeNodeComponent("button2"),
  internalVariantProps: PlasmicItemBooking__VariantProps,
  internalArgProps: PlasmicItemBooking__ArgProps
});

export default PlasmicItemBooking;
/* prettier-ignore-end */
